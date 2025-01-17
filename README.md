# CasWeb

## Getting started

```
npm install
node private/server.js
```

## Environment

Create a file named ``.env`` in the project root directory.

Example:

```
NODE_ENV=development
API_URL_DEV=https://example.com/api
API_URL_PROD=https://example.com/api
```

## API Urls

Use this: https://docs.strapi.io/dev-docs/api/rest/interactive-query-builder

### Casinos

```
{
  populate: {
    Boni: {
      fields: ['Percent', 'upTo']
    },
    category: {
      fields: ['Name'],
      populate: {
        LabelColor: {
          fields: ['Hex']
        },
      }
    },
    features: {
      fields: ['Name'],
      populate: {
        Label: {
          fields: ['Label','Description'],
          populate: {
            color: {
              fields: ['Hex']
          },
          fontColor: {
              fields: ['Hex']
          },
          icon: {
            fields: ['Alt'],
            populate: {
              Image: {
                fields: ['url']
              }
              }
            }
          }
        }
      }
    },
    Logo: {
      fields: ['url']
    }
  },
  fields: ['Name', 'MaxBet', 'Wager', 'WagerType', 'Label', 'Slug', 'MaxCashout', 'SortOrder', 'isNew'],
}
```

### Casino Details

```
{
  populate: {
    Boni: {
      fields: ['Percent', 'upTo', 'PromoCode', 'PromoCodeDescription', 'Freespins']
    },
    payment_methods: {
      fields: ['Name', 'SortOrder'],
      populate: {
        Logo: {
          fields: ['url']
        }
      }
    },
    features: {
      fields: ['Name'],
      populate: {
        icon: {
          fields: ['Alt'],
          populate: {
            Image: {
              fields: ['url']
            }
          }
        },
        Label: {
          fields: ['Label'],
          populate: {
            color: {
              fields: ['Hex']
            },
            icon: {
              fields: ['Alt'],
              populate: {
                Image: {
                  fields: ['url']
                }
              }
            },
          }
        }
      }
    },
    providers: {
      fields: ['Name', 'SortOrder'],
      populate: {
        Logo: {
          fields: ['url']
        }
      }
    },
    company: {
      fields: ['Name']
    },
    license: {
      fields: ['Name'],
      populate: {
        Logo: {
          fields: ['url']
        }
      }
    },
    EgonsReview: {
      fields: ['Title', 'Description']
    }
  },
  fields: ['Name', 'Label'],
}
```