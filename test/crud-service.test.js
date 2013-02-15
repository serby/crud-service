var emptyFn = function () {}

function createContactCrudService() {
  var crudService = require('..')
    , save = require('save')('test', { logger: { info: emptyFn }})
    , schema = require('schemata')(
      { _id:
        { type: Number
        }
      , name:
        { type: String
          }
      , email:
        { type: String
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
    it('should')
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