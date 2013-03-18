var emptyFn = function () {}
  , validity = require('validity')
  , should = require('should')

function createContactCrudService() {
  var crudService = require('..')
    , save = require('save')('test', { logger: { info: emptyFn }})
    , schema = require('schemata')(
      { _id:
        { type: String
        }
      , name:
        { type: String
        , validators:
          { all: [validity.required]
          }
        }
      , email:
        { type: String
        ,  validators:
          { all: [validity.required]
          }
        }
      })

  return crudService('Contact', save, schema)
}

var should = require('should')
  , _ = require('lodash')
  , fixtures = {
  contact: { name: 'Paul', email: 'paul@serby.net'}
}

describe('crud-service', function () {

  describe('create()', function () {
    var service

    beforeEach(function () {
      service = createContactCrudService()
    })

    it('should')

    it('should strip unknown properties', function (done) {

      service.pre('create', function (object, cb) {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul'
        , email: 'paul@serby.net'
        }, function (error, newObject) {
          should.not.exist(error)
          should.not.exist(newObject.extraneous)
          done()
        })

    })

  })

  describe('read()', function () {
    var service
      , id
      , obj
    beforeEach(function (done) {
      service = createContactCrudService()
      service.create(
        { name: 'Paul'
        , email: 'paul@serby.net'
        }, function (error, newObject) {
          id = newObject._id
          obj = newObject
          done()
        })
    })

    it('should cast id param to correct type', function (done) {
      service.read('' + id, function (error, object) {
        object.should.eql(obj)
        done()
      })
    })

    it('should strip unknown properties', function (done) {

      service.pre('create', function (object, cb) {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul'
        , email: 'paul@serby.net'
        }, function (error, newObject) {
          service.read(newObject._id, function (error, object) {
            should.not.exist(error)
            should.not.exist(object.extraneous)
          })
          done()
        })

    })

  })

  describe('update()', function () {
    var service
      , id

    beforeEach(function (done) {
      service = createContactCrudService()
      service.pre('update', function (object, cb) {
        object.extraneous = 'remove me'
        cb(null, object)
      })
      service.create(
        { name: 'Paul'
        , email: 'paul@serby.net'
        }, function (error, newObject) {
          id = newObject._id
          done()
        })
    })

    it('should strip unknown properties', function (done) {

      service.update(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, {}, function (error, object) {
          should.not.exist(error)
          should.not.exist(object.extraneous)
          done()
        })

    })
  })

  describe('partialUpdate()', function () {
    var service
      , id
    beforeEach(function (done) {
      service = createContactCrudService()
      service.create({ name: 'Paul', email: 'paul@serby.net'}, function (error, newObject) {
        id = newObject._id
        done()
      })
    })

    it('should only update part of object', function (done) {
      var partial = { _id: id, name: 'Serby'}

      service.partialUpdate(partial, function (error, updatedObject) {
        should.not.exist(error)
        updatedObject.should.eql(_.extend({}, fixtures.contact, partial))
        done()
      })
    })

    it('should throw an error when target can not be found', function (done) {

      var partial = {_id: 'unknown', email: 'noone@nowhere.net'}

      service.partialUpdate(partial, function (error) {

        error.message.should.eql('Couldn\'t find object with an _id of ' + partial._id)
        done()
      })
    })


    it('should be preprocessed', function (done) {

      var partial = { _id: id, name: 'Serby'}
      service.pre('partialUpdate', function (input, callback) {
        input.name = input.name.toUpperCase()
        callback(null, input)
      })
      service.partialUpdate(partial, function (error, updatedObject) {

        should.not.exist(error)
        updatedObject.should.eql(_.extend({}, fixtures.contact, partial,
          { name: 'SERBY' }))
        done()
      })
    })

    it('should strip unknown properties', function (done) {

      service.pre('partialUpdate', function (object, cb) {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.partialUpdate(
        { name: 'Paul Serby'
        , _id: id
        }, {}, function (error, object) {
          should.not.exist(error)
          should.not.exist(object.extraneous)
          done()
        })

    })

  })

  describe('delete()', function () {
    it('should')
  })

  describe('deleteMany()', function () {
    it('should')
  })

  describe('find()', function () {
    it('should')

    it('should strip unknown properties', function (done) {

      var service = createContactCrudService()

      service.pre('create', function (object, cb) {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul'
        , email: 'paul@serby.net'
        }, function () {
          service.create(
            { name: 'Ben'
            , email: 'bn@grly.me'
            }, function () {
              service.find({ name: 'Ben'}, function (error, objects) {
                should.not.exist(error)
                objects.forEach(function (object) {
                  should.not.exist(object.extraneous)
                })
                done()
              })
            })
        })

    })

  })

  describe('count()', function () {
    it('should')
  })

  describe('pre()', function () {
    it('should')
  })
})