(function() {

  var passport = require('passport');
  var FacebookStrategy = require('passport-facebook').Strategy;
  var GitHubStrategy = require('passport-github').Strategy;
  var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
  var _ = require('underscore');
  var async = require('async');
  
  var settings = require('./settings.json');
  var db = require("./db");
  var ObjectId = require('mongojs').ObjectId;

  
  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });
  
  passport.deserializeUser(function(id, done) {
    findUserById(id, done);
  });
  
  function findUserById(id, done) {
    db.users.findOne({_id: new ObjectId(id.toString()) }, function(err, user) {
      if (err) {
        return done(err, null);
      }

      if (!user) {
        return done("No user found", null);
      }
      
      return done(null, user);
    });
  }
  
  function attachUserIdentity(userId, identifier, done) {
    db.useridentities.insert({ userId: userId, identifier: identifier }, function(err, userIdentity) {
      done(err, userIdentity);
    });
  }
  
  function createUser(identifier, displayName, emails, done) {
    db.users.insert({ displayName: displayName }, function(err, user) {
      if (err) {
        done(err, null);
      } else {
        attachUserIdentity(user._id, identifier, function (attachErr, attachedIdentity) {
          done(attachErr, user);
        });
      }
    });
  }
  
  function findUserEmailByAddress(address, done) {
    db.useremails.findOne({address: address}, function(err, userEmail) {
      done(err, userEmail);
    });
  }
  
  function findUserEmailsByAddresses(emails, done) {
    db.useremails.find({ address: { $in: emails } }, function(err, userEmails) {
      if (err) {
        return done(err, null);
      }
      
      return done(null, userEmails);
    });
  }
  
  function findUsersByEmails(emails, done) {
    findUserEmailsByAddresses(emails, function (err, userEmails) {
      if (err) {
        done(err, null);
      } else {
        async.each(userEmails, function (userEmail, callback) {
          findUserById(userEmail.userId, callback);
        }, function (err, result) {
          done(err, result||[]);
        });
      }
    });
  }
  
  function addEmail(userId, address, done) {
    findUserEmailByAddress(address, function (err, userEmail) {
      if (err) {
        done(err, null);
      } else {
        if (userEmail) {
          done(null, userEmail);
        } else {
          db.useremails.insert({userId: userId, address: address}, function(insertErr, insertedUserEmail) {
            done(insertErr, insertedUserEmail);
          });
        }
      }
    });
  }
  
  function addEmails(user, emails, done) {
    async.each(emails, function (email, callback) {
      addEmail(user._id, email, function (err, userEmail) {
        callback(err, userEmail);
      });
    }, function (err, result) {
      done(err, result);
    });
  }
  
  function loginUser(identifier, displayName, emails, done) {
    db.useridentities.findOne({identifier: identifier}, function(err, userIdentity) {
      if (userIdentity) {
        findUserById(userIdentity.userId, function (err, user) {
          done(err, user);
        });
      } else {
        findUsersByEmails(emails, function (findErr, users) {
          if (findErr) {
            done(findErr, null);
          } else {
            if (users.length === 0) {
              createUser(identifier, displayName, emails, function (createErr, createdUser) {
                done(createErr, createdUser);
              });
            } else if (users.length > 1) {
              done("Conflicting user accounts", null);
            } else {
              attachUserIdentity(users[0]._id, identifier, function (attachErr, attachedIdentity) {
                done(attachErr, users[0]);
              });
            }
          }
        });
      }
    });
  }
  
  function login(identifier, displayName, emails, done) {
    loginUser(identifier, displayName, emails, function (err, user) {
      if (err) {
        done(err, null);
      } else {
        addEmails(user, emails, function (addErr, userEmails) {
          done(addErr, user);
        });
      }
    });
  }

  if (settings.auth.facebook) {
    passport.use(new FacebookStrategy({
      clientID : settings.auth.facebook.clientId,
      clientSecret : settings.auth.facebook.clientSecret,
      callbackURL : "/auth/facebook/callback"
    }, function(accessToken, refreshToken, profile, done) {
      login(profile.provider + '-' + profile.id, profile.displayName, _.pluck(profile.emails, 'value'), function (err, user) {
        done(err, user);
      });
    }));
  }

  if (settings.auth.google) {
    passport.use(new GoogleStrategy({
      clientID : settings.auth.google.clientId,
      clientSecret : settings.auth.google.clientSecret,
      callbackURL : "/auth/google/callback"
    }, function(accessToken, refreshToken, profile, done) {
      login(profile.provider + '-' + profile.id, profile.displayName, _.pluck(profile.emails, 'value'), function (err, user) {
        done(err, user);
      });
    }));
  }

  if (settings.auth.github) {
    passport.use(new GitHubStrategy({
      clientID : settings.auth.github.clientId,
      clientSecret : settings.auth.github.clientSecret,
      callbackURL : "/auth/github/callback"
    }, function(accessToken, refreshToken, profile, done) {
      login(profile.provider + '-' + profile.id, profile.displayName, _.pluck(profile.emails, 'value'), function (err, user) {
        done(err, user);
      });
    }));
  }
  
  module.exports = {
    loggedIn: function (req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect('/login?redirectUrl=' + req.path);
    },
    loggedInNoRedirect: function (req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      } else {
        res.send("Unauthorized", 401);
      }
    },
    storeRedictUrl: function (req, res, next) {
      if (req.query.redirectUrl) {
        req.session.redirectUrl = req.query.redirectUrl;
      }
      
      return next();
    },
    ensureFileUser: function (req, res, next) {
      var fileId = new ObjectId(req.params.fileid);
      
      db.fileusers.findOne({ fileId: fileId, userId: req.user._id }, function (err, fileUser) {
        if (err) {
          res.send(err, 500);
        } else {
          if (fileUser) {
            next();
          } else {
            db.fileusers.insert({ fileId: fileId, userId: req.user._id, role: "GUEST" }, function (userErr, fileUser) {
              if (userErr) {
                res.send(userErr, 500);
              } else {
                next();
              }
            });
          }
        }
      });

    }
  };

}).call(this);