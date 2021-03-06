const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const Counter = require("../models/counter.model");

 class UserCtrl {
  static create(req, res) {

    // get data from requests
    const userData = req.body;
    // console.log("hello");
    const salt = bcrypt.genSaltSync(10);
    const encryptedPass = bcrypt.hashSync(userData.password, salt);
    userData.password = encryptedPass;

    Counter.findOne({ type: "user" }, (err, result) => {
      if (err || !result) {
        res
          .status(500)
          .send({ message: "Could not inserted. Try again ", error: err });
      } else {
        userData.id = result.count + 1;
        // create model Object
        const user = new User(userData);
        // save data to db

        user
          .save()
          .then(result => {
            // user created succesfully'

            Counter.findOneAndUpdate(
              { type: "user" },
              { count: userData.id },
              (err, result) => {
                console.log(err);
                console.log("user counter incremented", result);
              }
            );

            res.status(200).send({
              message: "user created succesfully",
              data: _.pick(user, [
                "_id",
                "id",
                "name",
                "email",
                "mobile",
                "status"
              ])
            });
          })
          .catch(err => {
            // error occured while inserting user details

            res.status(500).send({
              message: "Could not create user. Please try again",
              error: err
            });
          });
      }
    });
  }

  static update(req, res)
  {
    const id = req.params.id;
    const doc = req.body;

    if(doc.password)
    {
      const salt = bcrypt.genSaltSync(10);
      const encryptedPass = bcrypt.hashSync(doc.password, salt);
      doc.password = encryptedPass;
    }
    
    User.findOneAndUpdate({ id: id }, doc, { new: true }, (err, result) => {
      if(err || !result)
      {
        res
        .status(404)
        .send({ message: "Could not updated. Please try again", error: err });
      }
      else
      {
        console.log(result);

        res.status(200).send({
          message: "User Updated Successfully",
          data: _.pick(result, ["_id", "id", "name", "email", "mobile", "status"])
        })
      } // else
    }) // findOneAndUpdate()
  } // update()

  static delete(req, res) 
  {
    const id = req.params.id;

    User.findOneAndDelete({ id: id }, (err, result) => {
      if(err || !result)
      {
        res
        .status(404)
        .send({ message: "Could not deleted. Please try again", error: err });
      }
      else
      {
        console.log(result);

        res.status(200).send({
          message: "User Deleted Successfully",
          data: _.pick(result, ["_id", "id", "name", "email", "mobile", "status"])
        })
      } // else
    }) // findOneAndUpdat
  }

  static getUser(req, res)
  {
    const param = req.params.id;
    const id = isNaN(param) ? 0 : parseInt(param);
    // console.log("id",id);

    User.findOne(
      { $or: [{ id: id }, { email: param }, { mobile: param }] },
      (err, result) => {
        if (err || !result) {
          res.status(404).send({ message: "User not available", error: err });
        } else {
          res.status(200).send({
            message: "User details",
            data: _.pick(result, [
              "_id",
              "id",
              "name",
              "email",
              "mobile",
              "status"
            ])
          });
        }
      }
    );
  }

  static getUsers(req, res) {

    const token = req.headers.authorization;
    console.log("token:", token);
    
    if(!token)
    {
      res.status(403).send({
        message: "You must login to access user list",
        error: "Forbidden"
      })
    }
    else{
      jwt.verify(token, 'abcd', (err, payload) => {
        if(err || payload.role != "admin")
          res.status(401).send({
            message: "Session expired, Please login again",
            error: err
          });
          else
            User.find({}, (err, result) => {
              if (err || !result) {
                res.status(404).send({ message: "User not available", error: err });
              } else {
                const updateList = _.map(result, function(user) {
                  return _.pick(user, [
                    "_id",
                    "id",
                    "name",
                    "email",
                    "mobile",
                    "status"
                  ]);
                });
                res.status(200).send({ message: "User List", data: updateList });
              }
            });
      });
    }
  
  }

  static authenticate(req, res)
  {
    const { email, password } = req.body;

    User.findOne({ email: email }, (err, result) => {
      if(err || !result)
      {
        res.status(404).send({ message: "Invalid Email", error: err });
      }
      else
      {
        bcrypt.compare(password, result.password)
              .then(data => {
                if(data)
                {
                  // for authentication generate json web token
                  try {
                    const token = jwt.sign({ role: "admin" }, 'abcd', { expiresIn: '1h' });
                    res.set("X-token", token);
                    res
                      .status(200)
                      .send({ message: "Login successful", data: data });
                  }
                  catch (e)
                  {
                    console.log(e);
                  }
                }
                else
                  res
                    .status(404)
                    .send({ message: "Invalid Password", error: "not matched" });
              })
              .catch(err => {
                res
                    .status(404)
                    .send({ message: "Invalid password", error: err });
              })
      }
    })
  } // authenticate()

} // class end

module.exports = UserCtrl;
