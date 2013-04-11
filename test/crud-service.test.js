var emptyFn = function () {}
  , validity = require('validity')
  , should = require('should')

function createContactCrudService() {
  var crudService = require('..')
    , save = require('save')('test', { logger: { info: emptyFn }})
    , schema = require('schemata')(
      { _id:
        { type: String
        , tag: ['a', 'b']
        }
      , name:
        { type: String
        , tag: ['a']
        , validators:
          { all: [validity.required]
          }
        }
      , email:
        { type: String
        , tag: ['b']
        ,  validators:
          { all: [validity.required]
          }
        }
      , mobile:
        { type: String
        , tag: ['c']
        }
    })

  return crudService('Contact', save, schema)
}

var should = require('should')
  , _ = require('lodash')
  , fixtures = {
  contact: { name: 'Paul', email: 'paul@serby.net', mobile: null }
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

    describe('options', function () {
      it('should only store and validate tagged options', function (done) {
        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          }, { tag: 'a' }, function (error, newObject) {
            should.not.exist(error)
            should.not.exist(newObject.email)
            done()
          })
      })

      it('should validate all properties even with .persist tag is set', function (done) {
        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          }, { persist: 'a' }, function (error) {
            error.errors.should.eql({ email: 'Email is required' })
            done()
          })
      })

      it('should only store tagged options', function (done) {
        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          }, { persist: 'b', validate: 'b' }, function (error, newObject) {

            should.not.exist(newObject.name)
            should.exist(newObject.email)
            done()
          })
      })

      it('should only validate tagged options', function (done) {
        service.create(
          {}, { validate: 'b' }, function (error) {
            error.errors.should.eql({ email: 'Email is required' })
            done()
          })
      })

      it('should error when only persist tagged but not validation', function (done) {
        service.create(
          { name: 'Paul'
          }, { persist: 'c' }, function (error) {
            error.errors.should.eql({ name: 'Name is required', email: 'Email is required' })
            done()
          })
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

    describe('options', function () {
      it('should only store and validate tagged options', function (done) {
        service.update(
          { _id: id
          , name: 'Paul'
          , email: 'Foo'
          }, { tag: 'a' }, function (error, newObject) {
            should.not.exist(error)
            newObject.email.should.equal('paul@serby.net')
            done()
          })
      })

      it('should validate all properties even with .persist tag is set', function (done) {
        service.create(
          { _id: id
          , name: 'Paul'
          , email: 'paul@serby.net'
          }, { persist: 'a' }, function (error) {
            error.errors.should.eql({ email: 'Email is required' })
            done()
          })
      })

      it('should only store tagged options', function (done) {
        service.create(
          { _id: id
          , name: 'Paul'
          , email: 'paul@serby.net'
          }, { persist: 'b', validate: 'b' }, function (error, newObject) {

            should.not.exist(newObject.name)
            should.exist(newObject.email)
            done()
          })
      })

      it('should only validate tagged options', function (done) {
        service.create(
          {}, { validate: 'b' }, function (error) {
            error.errors.should.eql({ email: 'Email is required' })
            done()
          })
      })

      it('should error when only persist tagged but not validation', function (done) {
        service.create(
          { name: 'Paul'
          }, { persist: 'c' }, function (error) {
            error.errors.should.eql({ name: 'Name is required', email: 'Email is required' })
            done()
          })
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