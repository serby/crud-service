var emptyFn = function () {}
  , validity = require('validity')
  , should = require('should')
  , schemata = require('schemata')
  , stream = require('stream')
  , _ = require('lodash')
  , fixtures =
    { contact:
      { name: 'Paul'
      , email: 'paul@serby.net'
      , mobile: null
      , comments: []
      }
    }

function createContactCrudService(ignoreTagForSubSchema) {
  var crudService = require('..')
    , save = require('save')('test', { logger: { info: emptyFn }})
    , subSchema = schemata(
      { thread:
        { type: String
        , tag: ['a']
        }
      , comment:
        { type: String
        , tag: ['c']
        }
      }
    )
    , schema = schemata(
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
      , comments:
        { type: schemata.Array(subSchema)
        , tag: ['a']
        }
      }
    )

  var options = { ignoreTagForSubSchema: ignoreTagForSubSchema }

  return crudService('Contact', save, schema, options)
}

describe('crud-service', function () {

  describe('create()', function () {
    var service

    beforeEach(function () {
      service = createContactCrudService()
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
          should.not.exist(error)
          should.not.exist(newObject.extraneous)
          done()
        })

    })

    it('should emit create', function (done) {

      service.on('create', function (obj) {
        obj.name.should.equal('Paul Serby')
        done()
      })

      service.create(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        }, function () {})

    })

    it('should emit create with createOptions', function (done) {

      service.on('create', function (obj, options) {
        obj.name.should.equal('Paul Serby')
        options.test.should.equal('Test')
        done()
      })

      service.create(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        }, { test: 'Test' }, function () {})

    })

    it('should emit create with an empty createOptions if none defined', function (done) {

      service.on('create', function (obj, options) {
        obj.name.should.equal('Paul Serby')
        should.deepEqual(options, {})
        done()
      })

      service.create(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        }, function () {})

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

      it('should store sub-schema properties regardless of tag if ignoreTagForSubSchemas is true', function(done) {
        //Set ignoreTagForSubSchema to true
        service = createContactCrudService(true)

        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          , comments:
            [ { thread: 'My Thread'
              , comment: 'My Comment'
              }
            , { thread: 'My Thread 2'
              , comment: 'My Second Comment'
              }
            ]
          }, { tag: 'a' }, function (error, newObject) {
            should.not.exist(error)

            should.not.exist(newObject.email)

            newObject.comments[0].comment.should.equal('My Comment')
            newObject.comments[0].thread.should.equal('My Thread')
            newObject.comments[1].comment.should.equal('My Second Comment')
            newObject.comments[1].thread.should.equal('My Thread 2')
            done()
          })
      })

      it('should store sub-schema properties with tag if ignoreTagForSubSchemas is false', function(done) {
        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          , comments:
            [ { thread: 'My Thread'
              , comment: 'My Comment'
              }
            , { thread: 'My Thread 2'
              , comment: 'My Second Comment'
              }
            ]
          }, { tag: 'a' }, function (error, newObject) {
            should.not.exist(error)

            should.not.exist(newObject.email)

            should.not.exist(newObject.comments[0].comment)
            newObject.comments[0].thread.should.equal('My Thread')

            should.not.exist(newObject.comments[0].comment)
            newObject.comments[1].thread.should.equal('My Thread 2')
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
            done()
          })
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

    it('should emit update', function (done) {

      service.on('update', function (obj) {
        obj.name.should.equal('Paul Serby')
        done()
      })

      service.update(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, {}, function () {})

    })

    it('should emit update with updateOptions', function (done) {

      service.on('update', function (obj, options) {
        obj.name.should.equal('Paul Serby')
        options.test.should.equal('Test')
        done()
      })

      service.update(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, { test: 'Test' }, function () {})

    })

    it('should emit update with an empty updateOptions if none defined', function (done) {

      service.on('update', function (obj, options) {
        obj.name.should.equal('Paul Serby')
        should.deepEqual(options, {})
        done()
      })

      service.update(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, function () {})

    })

    it('should use callback when no options are set', function (done) {

      service.update(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, function () {
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
        service.update(
          { _id: id
          , name: 'Paul'
          , email: 'paul@serby.net'
          }, { persist: 'a' }, function (error) {
            error.errors.should.eql({ email: 'Email is required' })
            done()
          })
      })

      it('should only store tagged options', function (done) {
        service.update(
          { _id: id
          , name: 'Paulo'
          , email: 'paul@serby.net'
          }, { persist: 'b', validate: 'b' }, function (error, newObject) {

            newObject.name.should.eql('Paul')
            should.exist(newObject.email)
            done()
          })
      })

      it('should store sub-schema properties regardless of tag if ignoreTagForSubSchemas is true', function (done) {
        //Set ignoreTagForSubSchema to true and set up initial object
        service = createContactCrudService(true)
        service.pre('update', function (object, cb) {
          object.extraneous = 'remove me'
          cb(null, object)
        })

        service.create(
          { name: 'Paul'
          , email: 'paul@serby.net'
          }, function (error, newObject) {
            id = newObject._id

            service.update(
              { _id: id
              , name: 'Paul'
              , email: 'foo'
              , comments:
                [ { thread: 'My Thread Updated'
                  , comment: 'My Comment Updated'
                  }
                , { thread: 'My Thread 2 Updated'
                  , comment: 'My Second Comment Updated'
                  }
                ]
              }, { tag: 'a', ignoreTagForSubSchema: true }, function (error, newObject) {
                should.not.exist(error)

                newObject.email.should.equal('paul@serby.net')

                newObject.comments[0].comment.should.equal('My Comment Updated')
                newObject.comments[0].thread.should.equal('My Thread Updated')
                newObject.comments[1].comment.should.equal('My Second Comment Updated')
                newObject.comments[1].thread.should.equal('My Thread 2 Updated')
                done()
              })
          })
      })

      it('should store sub-schema properties with tag if ignoreTagForSubSchemas is false', function (done) {
        service.update(
          { _id: id
          , name: 'Paul'
          , email: 'foo'
          , comments:
            [ { thread: 'My Thread Updated'
              , comment: 'My Comment'
              }
            , { thread: 'My Thread 2 Updated'
              , comment: 'My Second Comment'
              }
            ]
          }, { tag: 'a', ignoreTagForSubSchema: false }, function (error, newObject) {
            should.not.exist(error)

            newObject.email.should.equal('paul@serby.net')

            should.not.exist(newObject.comments[0].comment)
            newObject.comments[0].thread.should.equal('My Thread Updated')

            should.not.exist(newObject.comments[0].comment)
            newObject.comments[1].thread.should.equal('My Thread 2 Updated')
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


    it('should emit partialUpdate', function (done) {

      service.on('partialUpdate', function (obj) {
        obj.name.should.equal('Paul Serby')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby'
        , _id: id
        }, {}, function (error, object) {
          should.not.exist(error)
          should.not.exist(object.extraneous)
        })
    })

    it('should emit partialUpdate with original object', function (done) {

      service.on('partialUpdate', function (obj, originalObj) {
        obj.name.should.equal('Paul Serby')
        originalObj.name.should.equal('Paul')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, function () {})

    })

    it('should emit partialUpdate with updateOptions', function (done) {

      service.on('partialUpdate', function (obj, originalObj, options) {
        obj.name.should.equal('Paul Serby')
        options.test.should.equal('Test')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby'
        , email: 'paul@serby.net'
        , _id: id
        }, { test: 'Test' }, function () {})

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

    it('should strip unknown properties when returned as a stream', function (done) {

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
              var validateStream = new stream.Transform({ objectMode: true })

              validateStream._transform = function (item, encoding, done) {
                should.not.exist(item.extraneous)
                done(null, item)
              }

              validateStream.on('finish', done)

              service.find({ name: 'Ben'}).pipe(validateStream)
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
