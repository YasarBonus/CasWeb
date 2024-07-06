const express = require('express');
const app = express();
const port = 3000;

// Statische Dateien aus dem "public"-Ordner bereitstellen
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Routen

const i18n = require('i18n');

i18n.configure({
  locales:['en', 'de'],
  directory: __dirname + '/locales'
});

const MatomoTracker = require('matomo-tracker');
const matomo = new MatomoTracker(13, 'https://analytics.yasarbonus.com/matomo.php');
matomo.on('error', function(err) {
  console.log('error tracking request: ', err);
});

const apiUrl = 'https://api.yasarbonus.com/api';

app.get('/', (req, res) => {
  res.render('pages/index', {
      i18n: res
    })
});

app.get('/faq', (req, res) => {
  res.render('pages/faq');
});

// shortlinks path at /go/:slug
app.get('/go/:slug', (req, res) => {
  const slug = req.params.slug;

  // fetch the shortlink from the API
  fetch(apiUrl + `/shortlinks?populate=*&filters[Slug][$eq][0]=${slug}`)
    .then(response => response.json())
    .then(data => {
      // check if the shortlink exists
      if (data.data.length > 0) {
        // redirect to the shortlink URL
        res.redirect(302, data.data[0].attributes.Target);
        // log the hit in matomo
        matomo.track({
          url: `https://yasarbonus.com/go/${slug}`,
          action_name: `shortlink hit`,
          cvar: JSON.stringify({1: ['slug', slug], 2: ['shortlinkId', data.data[0].id], 3: ['target', data.data[0].attributes.Target]}),
          rand: Math.random(),
          ip: req.ip,
          ua: req.get('User-Agent'),
          lang: req.get('Accept-Language'),
          res: `${req.query.w}x${req.query.h}`,
        });
      } else {
        // check if there is a casino with the slug
        fetch(apiUrl + `/casinos?fields[0]=Slug&pagination[pageSize]=500&fields[1]=affiliateUrl&fields[2]=Name`)
          .then(response => response.json())
          .then(data => {
            console.log("Api Response:" + data.data);
            // check if the casino exists with the slug by filtering the data
            const casino = data.data.find(casino => casino.attributes.Slug === slug);
            
            console.log("Got casino: " + casino);
            if (casino) {
              // if the casino exists, redirect to the casino affiliateUrl
              res.redirect(302, casino.attributes.affiliateUrl);
              // log the hit in matomo
              matomo.track({
                url: `https://yasarbonus.com/go/${slug}`,
                action_name: `casino affiliate / link hit`,
                cvar: JSON.stringify({1: ['slug', slug], 2: ['casinoId', casino.id], 3: ['casino', casino.attributes.Name], 4: ['affiliateUrl', casino.attributes.affiliateUrl]}),
                rand: Math.random(),
                ip: req.ip,
                ua: req.get('User-Agent'),
                lang: req.get('Accept-Language'),
                res: `${req.query.w}x${req.query.h}`,
              });

            } else {
              // if the shortlink and casino do not exist, return a 404 error
              res.status(404).render('pages/error_pages/404');
            }
            
          })
          .catch(error => {
            console.error(error);
            // return a 500 error if there was an error fetching the casino
            res.status(500).render('pages/error_pages/500');
          });

      }
    })
    .catch(error => {
      console.error(error);
      // return a 500 error if there was an error fetching the shortlink
      res.status(500).render('pages/error_pages/500');
    });
});

// auto generated pages for casinos
app.get('/casino/:slug', (req, res) => {
  const slug = req.params.slug;

  // fetch the casino from the API
  fetch(apiUrl + `/casinos?fields[0]=Slug&pagination[pageSize]=500&fields[1]=Name&fields[2]=id`)
    .then(response => response.json())
    .then(data => {
      console.log("Api Response:" + data.data);
      // check if the casino exists with the slug by filtering the data
      const casino = data.data.find(casino => casino.attributes.Slug === slug);

      console.log("Got casino: " + casino.id);
      // check if the casino exists
      if (casino) {
        // render the casino page with the casino data
        res.render('pages/casino', {
          casino: casino,
        });
      } else {
        // if the casino does not exist, return a 404 error
        res.status(404).render('pages/error_pages/404');
      }
    })
    .catch(error => {
      console.error(error);
      // return a 500 error if there was an error fetching the casino
      res.status(500).render('pages/error_pages/500');
    });
});

// custom pages at /:slug
app.get('/:slug', (req, res) => {
  const slug = req.params.slug;

  // fetch the page from the API
  fetch(apiUrl + `/custom-pages?filters[Slug][$eq][0]=${slug}`)
    .then(response => response.json())
    .then(data => {
      console.log("Api Response:" + data);
      // check if the page exists
      if (data.data.length > 0) {
        // render the page with the page data
        res.render('pages/page', {
          page: data.data[0],
        });
      } else {
        // if the page does not exist, return a 404 error
        res.status(404).render('pages/error_pages/404');
      }
    })
    .catch(error => {
      console.error(error);
      // return a 500 error if there was an error fetching the page
      res.status(500).render('pages/error_pages/500');
    });
});

// 301 Redirect
app.get('/casinos', (req, res) => {
  res.redirect(301, '/');
});

// 403 page - load 404.ejs
app.use((req, res) => {
  res.status(403).render('pages/error_pages/403');
});

// 404 page - load 404.ejs
app.use((req, res) => {
  res.status(404).render('pages/error_pages/404');
});

// 500 Error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error_pages/500');
});

// Server starten
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

