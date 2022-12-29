'use strict';

const config = require('../config')
const express = require('express')
const userService = require('../services/user-service')
const fbService = require('../services/fb-service')
const router = express.Router();


router.get('/', (req, res) => {
  res.render('login')
})

router.get('/no-access', (req, res) => {
  res.render('no-access')
})

router.get('/broadcast', ensureAuthenticated, (req, res) => {
  res.render('broadcast', {user: req.user})
})

router.post('/broadcast', ensureAuthenticated, (req, res) => {
  res.render('broadcast-confirm')
})

router.get('/broadcast-send', ensureAuthenticated, (req, res) => {
  res.redirect('/broadcast/broadcast-sent')
})

router.get('/broadcast-sent', ensureAuthenticated, (req, res) => {
  res.render('/broadcast/broadcast-sent')
})

router.get('/logout', ensureAuthenticated, (req, res) => {
  req.logout()
  res.redirect('/broadcast')
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log(`${req.user.id} === ${config.ADMIN_ID}`)
    if (req.user.id === config.ADMIN_ID) {
      return next()
    }
    
    res.redirect('/broadcast/no-access')
  } else {
    res.redirect('/broadcast')
  }
}

module.exports = router