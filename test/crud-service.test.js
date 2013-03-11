var emptyFn = function () {}
  , validity = require('validity')

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
    it('should')
  })

  describe('read()', function () {
    var service
      , id
      , obj
    before(function (done) {
      service = createContactCrudService()
      service.create({ name: 'Paul', email: 'paul@serby.net'}, function (error, newObject) {
        id = newObject._id
        obj = newObject
        done()
      })
    })

    it('should cast id param to correct type', function (done) {
      service.read('' + id, function (error, entity) {
        entity.should.eql(obj)
        done()
      })
    })
  })

  describe('update()', function () {
    it('should')
  })

  describe('partialUpdate()', function () {
    var service
      , id
    before(function (done) {
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
  })

  describe('delete()', function () {
    it('should')
  })

  describe('deleteMany()', function () {
    it('should')
  })

  describe('find()', function () {
    it('should')
  })

  describe('count()', function () {
    it('should')
  })

  describe('pre()', function () {
    it('should')
  })
})