const express = require("express");
const app = express();
const port = 3000;

// require dotenv
require("dotenv").config();

const apiUrl = process.env.NODE_ENV === "production" ? process.env.API_URL_PROD : process.env.API_URL_DEV;

// Winston logger
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// EMAILS

const nodemailer = require('nodemailer');

// SMTP

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

// create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// function to send email to user
// "to" is the user id, "subject" is the subject, "text" is the text version, "html" is the html version

function sendEmail(to, subject, text, html) {
  if (typeof to === 'number') {
    db.query('SELECT email FROM users WHERE id = ?', [to], (err, result) => {
      if (err) {
        logger.error('Error querying database: ' + err);
        return;
      }
      const mailOptions = {
        from: SMTP_FROM,
        to: result[0].email,
        subject: subject,
        text: text,
        html: html,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          logger.error('Error sending email: ' + err);
          return;
        }
        logger.info('Email sent: ' + info.response);
      });
    });
  } else {
    const mailOptions = {
      from: SMTP_FROM,
      to: to,
      subject: subject,
      text: text,
      html: html,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        logger.error('Error sending email: ' + err);
        return;
      }
      logger.info('Email sent: ' + info.response);
    });
  }
};

// Statische Dateien aus dem "public"-Ordner bereitstellen
app.use(express.static("public"));
app.set("view engine", "ejs");

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Routen

const i18n = require("i18n");
const MatomoTracker = require("matomo-tracker");

i18n.configure({
  locales: ["en", "de"],
  directory: __dirname + "/locales",
});

const matomo = new MatomoTracker(13, "https://analytics.yasarbonus.com/matomo.php");
matomo.on("error", function (err) {
  logger.error("error tracking request: ", err);
});

// Logging middleware
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.render("pages/index", {
    i18n: res,
  });
});

app.get("/faq", (req, res) => {
  res.render("pages/faq");
});

// shortlinks path at /go/:slug
app.get("/go/:slug", (req, res) => {
  const slug = req.params.slug;

  // fetch the shortlink from the API
  fetch(apiUrl + `/shortlinks?populate=*&filters[Slug][$eq][0]=${slug}`)
    .then((response) => response.json())
    .then((data) => {
      // check if the shortlink exists
      if (data.data.length > 0) {
        // redirect to the shortlink URL
        res.redirect(302, data.data[0].attributes.Target);
        // log the hit in matomo
        matomo.track({
          url: `https://yasarbonus.com/go/${slug}`,
          action_name: `shortlink hit`,
          cvar: JSON.stringify({
            1: ["slug", slug],
            2: ["shortlinkId", data.data[0].id],
            3: ["target", data.data[0].attributes.Target],
          }),
          rand: Math.random(),
          ip: req.ip,
          ua: req.get("User-Agent"),
          lang: req.get("Accept-Language"),
          res: `${req.query.w}x${req.query.h}`,
        });
      } else {
        // check if there is a casino with the slug
        fetch(
          apiUrl +
            `/casinos?fields[0]=Slug&pagination[pageSize]=500&fields[1]=affiliateUrl&fields[2]=Name`
        )
          .then((response) => response.json())
          .then((data) => {
            // check if the casino exists with the slug by filtering the data
            const casino = data.data.find((casino) => casino.attributes.Slug === slug);
            if (casino) {
              // if the casino exists, redirect to the casino affiliateUrl
              res.redirect(302, casino.attributes.affiliateUrl);
              // log the hit in matomo
              matomo.track({
                url: `https://yasarbonus.com/go/${slug}`,
                action_name: `casino affiliate / link hit`,
                cvar: JSON.stringify({
                  1: ["slug", slug],
                  2: ["casinoId", casino.id],
                  3: ["casino", casino.attributes.Name],
                  4: ["affiliateUrl", casino.attributes.affiliateUrl],
                }),
                rand: Math.random(),
                ip: req.ip,
                ua: req.get("User-Agent"),
                lang: req.get("Accept-Language"),
                res: `${req.query.w}x${req.query.h}`,
              });
            } else {
              // if the shortlink and casino do not exist, return a 404 error
              res.status(404).render("pages/error_pages/404");
            }
          })
          .catch((error) => {
            console.error(error);
            // return a 500 error if there was an error fetching the casino
            res.status(500).render("pages/error_pages/500");
          });
      }
    })
    .catch((error) => {
      console.error(error);
      // return a 500 error if there was an error fetching the shortlink
      res.status(500).render("pages/error_pages/500");
    });
});

// auto generated pages for casinos
app.get("/casino/:slug", (req, res) => {
  const slug = req.params.slug;

  // fetch the casino from the API
  fetch(apiUrl + `/casinos?fields[0]=Slug&pagination[pageSize]=500&fields[1]=Name&fields[2]=id`)
    .then((response) => response.json())
    .then((data) => {
      // check if the casino exists with the slug by filtering the data
      const casino = data.data.find((casino) => casino.attributes.Slug === slug);
      // check if the casino exists
      if (casino) {
        // render the casino page with the casino data
        res.render("pages/casino", {
          casino: casino,
        });
      } else {
        // if the casino does not exist, return a 404 error
        res.status(404).render("pages/error_pages/404");
      }
    })
    .catch((error) => {
      console.error(error);
      // return a 500 error if there was an error fetching the casino
      res.status(500).render("pages/error_pages/500");
    });
});


// generate sitemap.xml from API for casinos, custom-pages and Menu from website
app.get("/sitemap.xml", (req, res) => {
  // fetch the casinos from the API
  fetch(apiUrl + `/casinos?fields[0]=Slug&pagination[pageSize]=500`)
    .then((response) => response.json())
    .then((data) => {
      // fetch the custom pages from the API
      fetch(apiUrl + `/custom-pages?fields[0]=Slug&pagination[pageSize]=500`)
        .then((response) => response.json())
        .then((customPages) => {
          fetch(apiUrl + `/website?populate=*`)
            .then((response) => response.json())
            .then((website) => {
              // render the sitemap with the casino and custom page data
              res.set("Content-Type", "text/xml");
              res.render("pages/sitemap", {
                casinos: data.data,
                customPages: customPages.data,
                pages: website.data.attributes.Menu.map((page) => {
                  return {
                    Slug: page.Target,
                  };
                }, []),
                domain: "https://staging.yasarbonus.com",
              });
              console.log("Sitemap generated with data: ", data.data, customPages.data, website.data.attributes.Menu);
            })
            .catch((error) => {
              console.error(error);
              // return a 500 error if there was an error fetching the website
              res.status(500).render("pages/error_pages/500");
            });
        })
        .catch((error) => {
          console.error(error);
          // return a 500 error if there was an error fetching the custom pages
          res.status(500).render("pages/error_pages/500");
        });
    })
    .catch((error) => {
      console.error(error);
      // return a 500 error if there was an error fetching the casinos
      res.status(500).render("pages/error_pages/500");
    });
});

// custom pages at /:slug
app.get("/:slug", (req, res) => {
  const slug = req.params.slug;

  // fetch the page from the API
  fetch(apiUrl + `/custom-pages?filters[Slug][$eq][0]=${slug}`)
    .then((response) => response.json())
    .then((data) => {
      // check if the page exists
      if (data.data.length > 0) {
        // render the page with the page data
        res.render("pages/page", {
          page: data.data[0],
        });
      } else {
        // if the page does not exist, return a 404 error
        res.status(404).render("pages/error_pages/404");
      }
    })
    .catch((error) => {
      console.error(error);
      // return a 500 error if there was an error fetching the page
      res.status(500).render("pages/error_pages/500");
    });
});

// 301 Redirect
app.get("/casinos", (req, res) => {
  res.redirect(301, "/");
});

// 403 page - load 404.ejs
app.use((req, res) => {
  res.status(403).render("pages/error_pages/403");
});

// 404 page - load 404.ejs
app.use((req, res) => {
  res.status(404).render("pages/error_pages/404");
});

// 500 Error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("pages/error_pages/500");
});

// Server starten
app.listen(port, () => {
  logger.info(`Server is listening at http://localhost:${port}`);
});
