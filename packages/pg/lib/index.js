'use strict'

var Client = require('./client')
var defaults = require('./defaults')
var Connection = require('./connection')
var Pool = require('pg-pool')
const { DatabaseError } = require('../../pg-protocol/dist')
const { escapeIdentifier, escapeLiteral } = require('./utils')

const poolFactory = (Client) => {
  return class BoundPool extends Pool {
    constructor(options) {
      super(options, Client)
    }
  }
}

var PG = function (clientConstructor) {
  this.defaults = defaults
  this.Client = clientConstructor
  this.Query = this.Client.Query
  this.Pool = poolFactory(this.Client)
  this._pools = []
  this.Connection = Connection
  this.types = require('pg-types')
  this.DatabaseError = DatabaseError
  this.Cursor = require('./cursor')
  this.escapeIdentifier = escapeIdentifier
  this.escapeLiteral = escapeLiteral
}

module.exports = new PG(Client)
