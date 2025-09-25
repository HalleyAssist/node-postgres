'use strict'

var types = require('pg-types')

var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/

let parserCache = new Map()

// result object returned from query
// in the 'end' event and also
// passed as second argument to provided callback
class Result {
  constructor(_rowMode, types) {
    this.command = null
    this.rowCount = null
    this.oid = null
    this.rows = []
    this.fields = []
    this._types = types
  }

  clear(){
    this.command = null
    this.rowCount = null
    this.oid = null
    this.rows = []
    this.fields = []
  }

  // adds a command complete message
  addCommandComplete(msg) {
    var match = matchRegexp.exec(msg.text ?? msg.command)
    if (!match)  return
    this.command = match[1]
    if (match[3]) {
      // COMMMAND OID ROWS
      this.oid = parseInt(match[2], 10)
      this.rowCount = parseInt(match[3], 10)
    } else if (match[2]) {
      // COMMAND ROWS
      this.rowCount = parseInt(match[2], 10)
    }
  }

  addRow(row) {
    this.rows.push(row)
  }

  static _p(p, v) {
    return v === null ? null : p(v)
  }

  addFields(fieldDescriptions) {
    // clears field definitions
    // multiple query statements in 1 action can result in multiple sets
    // of rowDescriptions...eg: 'select NOW(); select 1::int;'
    // you need to reset the fields
    this.fields = fieldDescriptions

    let localTypes = this._types || types

    let parseFn
    const cacheKey = fieldDescriptions.map(desc => desc.dataTypeID + "|" + desc.name).join(',')
    parseFn = parserCache.get(cacheKey)
    if(!parseFn) {
      parseFn = 'return function(rowData){return {'
      let args = [], args2 = []
      for (let i = 0; i < fieldDescriptions.length; i++) {
        let desc = fieldDescriptions[i]

        const parser = localTypes.getTypeParser(desc.dataTypeID, desc.format || 'text')
        if(parser === String) {
          parseFn += `${JSON.stringify(desc.name)}: rowData[${i}],`
        } else {
          parseFn += `${JSON.stringify(desc.name)}: _p(a${i},rowData[${i}]),`
          args.push('a' + i)
          args2.push(parser)
        }
      }

      parseFn += '}}'
      parseFn = new Function('_p', ...args, parseFn)
      parseFn = parseFn(Result._p, ...args2)
      if(parserCache.size > 256) {
        // prevent unbounded memory growth
        parserCache.clear()
      }
      parserCache.set(cacheKey, parseFn)
    }
    this.parseRow = parseFn
  }
}

module.exports = Result
