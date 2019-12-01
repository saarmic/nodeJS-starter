const { promisify } = require('util');
const graph = require('fbgraph');
const Twit = require('twit');
const stripe = require('stripe')(process.env.STRIPE_SKEY);
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const clockwork = require('clockwork')({ key: process.env.CLOCKWORK_KEY });
const ig = require('instagram-node').instagram();
const axios = require('axios');
const { google } = require('googleapis');
const validator = require('validator');


/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
  res.status(200).send([
    { mobj: 1 }
  ]);
};

/**
 * GET /api/facebook
 * Facebook API example.
 */
exports.getFacebook = (req, res, next) => {
  const token = req.user.tokens.find((token) => token.kind === 'facebook');
  graph.setAccessToken(token.accessToken);
  graph.get(`${ req.user.facebook }?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err, profile) => {
    if (err) { return next(err); }
    res.render('api/facebook', {
      title: 'Facebook API',
      profile
    });
  });
};


/**
 * GET /api/twitter
 * Twitter API example.
 */
exports.getTwitter = async (req, res, next) => {
  const token = req.user.tokens.find((token) => token.kind === 'twitter');
  const T = new Twit({
    consumer_key: process.env.TWITTER_KEY,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  try {
    const { data: { statuses: tweets } } = await T.get('search/tweets', {
      q: 'nodejs since:2013-01-01',
      geocode: '40.71448,-74.00598,5mi',
      count: 10
    });
    res.render('api/twitter', {
      title: 'Twitter API',
      tweets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/twitter
 * Post a tweet.
 */
exports.postTwitter = (req, res, next) => {
  const validationErrors = [];
  if (validator.isEmpty(req.body.tweet)) validationErrors.push({ msg: 'Tweet cannot be empty' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/api/twitter');
  }

  const token = req.user.tokens.find((token) => token.kind === 'twitter');
  const T = new Twit({
    consumer_key: process.env.TWITTER_KEY,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  T.post('statuses/update', { status: req.body.tweet }, (err) => {
    if (err) { return next(err); }
    req.flash('success', { msg: 'Your tweet has been posted.' });
    res.redirect('/api/twitter');
  });
};


/**
 * GET /api/stripe
 * Stripe API example.
 */
exports.getStripe = (req, res) => {
  res.render('api/stripe', {
    title: 'Stripe API',
    publishableKey: process.env.STRIPE_PKEY
  });
};

/**
 * POST /api/stripe
 * Make a payment.
 */
exports.postStripe = (req, res) => {
  const { stripeToken, stripeEmail } = req.body;
  stripe.charges.create({
    amount: 395,
    currency: 'usd',
    source: stripeToken,
    description: stripeEmail
  }, (err) => {
    if (err && err.type === 'StripeCardError') {
      req.flash('errors', { msg: 'Your card has been declined.' });
      return res.redirect('/api/stripe');
    }
    req.flash('success', { msg: 'Your card has been successfully charged.' });
    res.redirect('/api/stripe');
  });
};

/**
 * GET /api/twilio
 * Twilio API example.
 */
exports.getTwilio = (req, res) => {
  res.render('api/twilio', {
    title: 'Twilio API'
  });
};

/**
 * POST /api/twilio
 * Send a text message using Twilio.
 */
exports.postTwilio = (req, res, next) => {
  const validationErrors = [];
  if (validator.isEmpty(req.body.number)) validationErrors.push({ msg: 'Phone number is required.' });
  if (validator.isEmpty(req.body.message)) validationErrors.push({ msg: 'Message cannot be blank.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/api/twilio');
  }

  const message = {
    to: req.body.number,
    from: '+13472235148',
    body: req.body.message
  };
  twilio.messages.create(message).then((sentMessage) => {
    req.flash('success', { msg: `Text send to ${ sentMessage.to }` });
    res.redirect('/api/twilio');
  }).catch(next);
};

/**
 * GET /api/clockwork
 * Clockwork SMS API example.
 */
exports.getClockwork = (req, res) => {
  res.render('api/clockwork', {
    title: 'Clockwork SMS API'
  });
};

/**
 * POST /api/clockwork
 * Send a text message using Clockwork SMS
 */
exports.postClockwork = (req, res, next) => {
  const message = {
    To: req.body.telephone,
    From: 'Hackathon',
    Content: 'Hello from the Hackathon Starter'
  };
  clockwork.sendSms(message, (err, responseData) => {
    if (err) { return next(err.errDesc); }
    req.flash('success', { msg: `Text sent to ${ responseData.responses[ 0 ].to }` });
    res.redirect('/api/clockwork');
  });
};

/**
 * GET /api/instagram
 * Instagram API example.
 */
exports.getInstagram = async (req, res, next) => {
  const token = req.user.tokens.find((token) => token.kind === 'instagram');
  ig.use({ client_id: process.env.INSTAGRAM_ID, client_secret: process.env.INSTAGRAM_SECRET });
  ig.use({ access_token: token.accessToken });
  try {
    const userSelfMediaRecentAsync = promisify(ig.user_self_media_recent);
    const myRecentMedia = await userSelfMediaRecentAsync();
    res.render('api/instagram', {
      title: 'Instagram API',
      myRecentMedia
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/upload
 * File Upload API example.
 */

exports.getFileUpload = (req, res) => {
  res.render('api/upload', {
    title: 'File Upload'
  });
};

exports.postFileUpload = (req, res) => {
  req.flash('success', { msg: 'File was uploaded successfully.' });
  res.redirect('/api/upload');
};

/**
 * GET /api/pinterest
 * Pinterest API example.
 */
exports.getPinterest = (req, res, next) => {
  const token = req.user.tokens.find((token) => token.kind === 'pinterest');
  axios.get(`https://api.pinterest.com/v1/me/boards?access_token=${ token.accessToken }`)
    .then((response) => {
      res.render('api/pinterest', {
        title: 'Pinterest API',
        boards: response.data.data
      });
    })
    .catch((error) => {
      next(error);
    });
};
/**
 * POST /api/pinterest
 * Create a pin.
 */
exports.postPinterest = (req, res, next) => {
  const validationErrors = [];
  if (validator.isEmpty(req.body.board)) validationErrors.push({ msg: 'Board is required.' });
  if (validator.isEmpty(req.body.note)) validationErrors.push({ msg: 'Note cannot be blank.' });
  if (validator.isEmpty(req.body.image_url)) validationErrors.push({ msg: 'Image URL cannot be blank.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/api/pinterest');
  }

  const token = req.user.tokens.find((token) => token.kind === 'pinterest');
  const formData = {
    board: req.body.board,
    note: req.body.note,
    link: req.body.link,
    image_url: req.body.image_url
  };

  axios.post(`https://api.pinterest.com/v1/pins/?access_token=${ token.accessToken }`, formData)
    .then(() => {
      req.flash('success', { msg: 'Pin created' });
      res.redirect('/api/pinterest');
    })
    .catch((error) => {
      req.flash('errors', { msg: error.response.data.message });
      res.redirect('/api/pinterest');
    });
};

exports.getHereMaps = (req, res) => {
  const imageMapURL = `https://image.maps.api.here.com/mia/1.6/mapview?\
app_id=${process.env.HERE_APP_ID }&app_code=${ process.env.HERE_APP_CODE }&\
poix0=47.6516216,-122.3498897;white;black;15;Fremont Troll&\
poix1=47.6123335,-122.3314332;white;black;15;Seattle Art Museum&\
poix2=47.6162956,-122.3555097;white;black;15;Olympic Sculpture Park&\
poix3=47.6205099,-122.3514661;white;black;15;Space Needle&\
c=47.6176371,-122.3344637&\
u=1500&\
vt=1&&z=13&\
h=500&w=800&`;

  res.render('api/here-maps', {
    app_id: process.env.HERE_APP_ID,
    app_code: process.env.HERE_APP_CODE,
    title: 'Here Maps API',
    imageMapURL
  });
};

exports.getGoogleMaps = (req, res) => {
  res.render('api/google-maps', {
    title: 'Google Maps API',
    google_map_api_key: process.env.GOOGLE_MAP_API_KEY
  });
};

exports.getGoogleDrive = (req, res) => {
  const token = req.user.tokens.find((token) => token.kind === 'google');
  const authObj = new google.auth.OAuth2({
    access_type: 'offline'
  });
  authObj.setCredentials({
    access_token: token.accessToken
  });

  const drive = google.drive({
    version: 'v3',
    auth: authObj
  });

  drive.files.list({
    fields: 'files(iconLink, webViewLink, name)'
  }, (err, response) => {
    if (err) return console.log(`The API returned an error: ${ err }`);
    res.render('api/google-drive', {
      title: 'Google Drive API',
      files: response.data.files,
    });
  });
};
