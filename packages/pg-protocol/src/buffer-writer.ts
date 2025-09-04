//binary data writer tuned for encoding binary specific to the postgres binary protocol

const MaxSize = 8192 //8kb
const HeaderPosition = 0

export class Writer {
  private buffer: Buffer
  private offset: number = 5
  constructor(private size = 512) {
    this.buffer = Buffer.allocUnsafeSlow(size)
  }

  private ensure(size: number): void {
    let remaining = this.buffer.length - this.offset
    if (remaining < size) {
      let oldBuffer = this.buffer
      // exponential growth factor of around ~ 1.5
      // https://stackoverflow.com/questions/2269063/buffer-growth-strategy
      let newSize = oldBuffer.length + (oldBuffer.length >> 1) + size
      this.buffer = Buffer.allocUnsafeSlow(newSize)
      oldBuffer.copy(this.buffer)
    }
  }

  public addInt32(num: number): Writer {
    this.ensure(4)
    this.buffer[this.offset++] = (num >>> 24) & 0xff
    this.buffer[this.offset++] = (num >>> 16) & 0xff
    this.buffer[this.offset++] = (num >>> 8) & 0xff
    this.buffer[this.offset++] = (num >>> 0) & 0xff
    return this
  }

  public addInt16(num: number): Writer {
    this.ensure(2)
    this.buffer[this.offset++] = (num >>> 8) & 0xff
    this.buffer[this.offset++] = (num >>> 0) & 0xff
    return this
  }

  public addCString(string: string): Writer {
    if (!string) {
      this.ensure(1)
    } else {
      let len = Buffer.byteLength(string)
      this.ensure(len + 1) // +1 for null terminator
      this.buffer.write(string, this.offset, 'utf-8')
      this.offset += len
    }

    this.buffer[this.offset++] = 0 // null terminator
    return this
  }

  public addString(string: string = ''): Writer {
    let len = Buffer.byteLength(string)
    this.ensure(len)
    this.buffer.write(string, this.offset)
    this.offset += len
    return this
  }

  public addString32(string: string = ''): Writer {
    let len = Buffer.byteLength(string)
    this.ensure(len + 4)
    this.buffer[this.offset++] = (len >>> 24) & 0xff
    this.buffer[this.offset++] = (len >>> 16) & 0xff
    this.buffer[this.offset++] = (len >>> 8) & 0xff
    this.buffer[this.offset++] = (len >>> 0) & 0xff
    this.buffer.write(string, this.offset)
    this.offset += len
    return this
  }

  public add(otherBuffer: Buffer): Writer {
    this.ensure(otherBuffer.length)
    otherBuffer.copy(this.buffer, this.offset)
    this.offset += otherBuffer.length
    return this
  }

  private join(code?: number): Buffer {
    if (code) {
      this.buffer[HeaderPosition] = code
      //length is everything in this packet minus the code
      const length = this.offset - (HeaderPosition + 1)
      this.buffer.writeInt32BE(length, HeaderPosition + 1)
    }
    return this.buffer.slice(code ? 0 : 5, this.offset)
  }

  public flush(code?: number): Buffer {
    let result = this.join(code)
    this.offset = 5
    if(this.buffer.length > MaxSize) {
      this.buffer = Buffer.allocUnsafeSlow(this.size)
    }
    return result
  }
}
