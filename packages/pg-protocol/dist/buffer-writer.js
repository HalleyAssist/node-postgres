"use strict";
//binary data writer tuned for encoding binary specific to the postgres binary protocol
Object.defineProperty(exports, "__esModule", { value: true });
exports.Writer = void 0;
const MaxSize = 8192; //8kb
const HeaderPosition = 0;
class Writer {
    constructor(size = 512) {
        this.size = size;
        this.offset = 5;
        this.buffer = Buffer.allocUnsafeSlow(size);
    }
    ensure(size) {
        let remaining = this.buffer.length - this.offset;
        if (remaining < size) {
            let oldBuffer = this.buffer;
            // exponential growth factor of around ~ 1.5
            // https://stackoverflow.com/questions/2269063/buffer-growth-strategy
            let newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
            this.buffer = Buffer.allocUnsafeSlow(newSize);
            oldBuffer.copy(this.buffer);
        }
    }
    addInt32(num) {
        this.ensure(4);
        // use Node Buffer native method for big-endian 32-bit integer
        this.buffer.writeInt32BE(num, this.offset);
        this.offset += 4;
        return this;
    }
    addInt16(num) {
        this.ensure(2);
        // use Node Buffer native method for big-endian 16-bit integer
        this.buffer.writeInt16BE(num, this.offset);
        this.offset += 2;
        return this;
    }
    addCString(string) {
        if (!string) {
            this.ensure(1);
        }
        else {
            let len = Buffer.byteLength(string);
            this.ensure(len + 1); // +1 for null terminator
            // write with explicit length and utf8 encoding
            this.buffer.write(string, this.offset, len, 'utf8');
            this.offset += len;
        }
        this.buffer[this.offset++] = 0; // null terminator
        return this;
    }
    addString(string = '') {
        let len = Buffer.byteLength(string);
        this.ensure(len);
        // pass explicit length and encoding to avoid incorrect arg ordering
        if (len > 0) {
            this.buffer.write(string, this.offset, len, 'utf8');
            this.offset += len;
        }
        return this;
    }
    addString32(string = '') {
        let len = Buffer.byteLength(string);
        this.ensure(len + 4);
        // write 32-bit length prefix in big-endian order
        this.buffer.writeInt32BE(len, this.offset);
        this.offset += 4;
        if (len > 0) {
            this.buffer.write(string, this.offset, len, 'utf8');
            this.offset += len;
        }
        return this;
    }
    add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
    }
    join(code) {
        if (code) {
            this.buffer[HeaderPosition] = code;
            //length is everything in this packet minus the code
            const length = this.offset - (HeaderPosition + 1);
            this.buffer.writeInt32BE(length, HeaderPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
    }
    flush(code) {
        let result = this.join(code);
        this.offset = 5;
        if (this.buffer.length > MaxSize) {
            this.buffer = Buffer.allocUnsafeSlow(this.size);
        }
        return result;
    }
}
exports.Writer = Writer;
//# sourceMappingURL=buffer-writer.js.map