var Chip8 = function () {

     this.displayWidth = 64;
     this.displayHeight = 32;
     this.display = new Array(this.displayWidth * this.displayHeight);
     this.step = null;
     this.running = null;
     this.renderer = null;

	 var memory = new ArrayBuffer(0x1000);

     this.memory = new Uint8Array(memory);
     this.v = new Array(16);
     this.i = null;
     this.stack = new Array(16);
     this.sp = null;
     this.delayTimer = null;
     this.soundTimer = null;

     this.keys = {};
     this.reset();

 };

 Chip8.prototype = {
     loadProgram: function (program) {
         // Load program into memory
         for (i = 0; i < program.length; i++) {
             this.memory[i + 0x200] = program[i];
         }
     },

     setKey: function(key) {
        this.keys[key] = true;
     },

     unsetKey: function(key) {
        delete this.keys[key];
     },
	 
	 setKeyState: function(key, depressed) {
		this[["unset", "set"][+depressed] + "Key"](key);
	 },

     setRenderer: function (renderer) {
         this.renderer = renderer;
     },

     getDisplayWidth: function () {
         return this.displayWidth;
     },

     getDisplayHeight: function () {
         return this.displayHeight;
     },

     setPixel: function(x, y) {
        var location,
            width = this.getDisplayWidth(),
            height = this.getDisplayHeight();

        // If the pixel exceeds the dimensions,
        // wrap it back around.
        if (x > width) {
            x -= width;
        } else if (x < 0) {
            x += width;
        }

        if (y > height) {
            y -= height;
        } else if (y < 0) {
            y += height;
        }

        location = x + (y * width);

        this.display[location] ^= 1;

        return !this.display[location];
 },

     reset: function () {

         var i;

         // Reset memory.
         for (i = 0; i < this.memory.length; i++) {
             this.memory[i] = 0;
         }

         var hexChars = [
              0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
              0x20, 0x60, 0x20, 0x20, 0x70, // 1
              0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
              0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
              0x90, 0x90, 0xF0, 0x10, 0x10, // 4
              0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
              0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
              0xF0, 0x10, 0x20, 0x40, 0x40, // 7
              0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
              0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
              0xF0, 0x90, 0xF0, 0x90, 0x90, // A
              0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
              0xF0, 0x80, 0x80, 0x80, 0xF0, // C
              0xE0, 0x90, 0x90, 0x90, 0xE0, // D
              0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
              0xF0, 0x80, 0xF0, 0x80, 0x80 // F
          ];

          for (i = 0; i < hexChars.length; i++) {
              this.memory[i] = hexChars[i];
          }


         // Reset registers.
         for (i = 0; i < this.v.length; i++) {
             this.v[i] = 0;
         }

         // Reset display.
         for (i = 0; i < this.display.length; i++) {
            this.display[i] = 0;
         }

         // Reset stack pointer, I
         this.sp = 0;
         this.i = 0;

         // The program counter starts at 0x200, as
         // that is the start location of the program.
         this.pc = 0x200;

         this.delayTimer = 0;
         this.soundTimer = 0;

         this.step = 0;
         this.running = false;

     },

     start: function () {

         var i;

         if (!this.renderer) {
             throw new Error("You must specify a renderer.");
         }

         this.running = true;

         var self = this;
         requestAnimFrame(function me() {
             for (var i = 0; i < 10; i++) {
                if (self.running) {
                    self.emulateCycle();
                }
             }

             if (self.drawFlag) {
                 self.renderer.render(self.display);
                 self.drawFlag = false;
             }

             if ( ! (self.step++ % 2)) {
                self.handleTimers();
             }

             requestAnimFrame(me);

         });


     },

     stop: function () {
         this.running = false;
     },

     handleTimers: function() {
        if (this.delayTimer > 0) {
            this.delayTimer--;
        }

        if (this.soundTimer > 0) {
            if (this.soundTimer == 1) {
                this.renderer.beep();
            }
            this.soundTimer--;
        }
     },

     emulateCycle: function () {
         var opcode = this.memory[this.pc] << 8 | this.memory[this.pc + 1];
         var x = (opcode & 0x0F00) >> 8;
         var y = (opcode & 0x00F0) >> 4;

         this.pc += 2;

         // Check first nibble to determine opcode.
         switch (opcode & 0xf000) {

         case 0x0000:

             switch (opcode) {

                 // CLS
                 // OOE0
                 // CLear the display.
                 case 0x00E0:
                     this.renderer.clear();
                     for (var i = 0; i < this.display.length; i++) {
                        this.display[i] = 0;
                     }
                     break;

                 // RET
                 // 00EE
                 // Return from subroutine.
                 case 0x00EE:
                     this.pc = this.stack[--this.sp];
                     break;

             }

             break;

             // JP addr
             // 1nnnn
             // Jump to location nnn
             case 0x1000:
                 this.pc = opcode & 0xFFF;
                 break;

             // CALL addr
             // 2nnnn
             // Call subroutine at nnnn.
             case 0x2000:
                 this.stack[this.sp] = this.pc;
                 this.sp++;
                 this.pc = opcode & 0x0FFF;
                 break;

             // SE Vx, byte
             // 2xkk
             // Skip next instruction if vX equals kk.
             case 0x3000:
                 if (this.v[x] === (opcode & 0xFF)) {
                     this.pc += 2;
                 }
                 break;

             // SNE Vx, byte
             // 4xkk
             // Skip next instruction if vX doesn't equal kk.
             case 0x4000:
                 if (this.v[x] != (opcode & 0x00FF)) {
                     this.pc += 2;
                 }
                 break;

             // SE Vx, Vy
             // 5xy0
             // Skip next instruction if vX equals vY.
             case 0x5000:
                 if (this.v[x] === this.v[y]) {
                     this.pc += 2;
                 }
                 break;

             // LD Vx, byte
             // 6xkk
             // Set Vx equal to kk.
             case 0x6000:
                 this.v[x] = opcode & 0xFF;
                 break;

             // ADD Vx, byte
             // 7xkk
             // Set Vx equal to Vx + kk.
             case 0x7000:
                 var val = (opcode & 0xFF) + this.v[x]

                 if (val > 255) {
                     val -= 256;
                 }

                 this.v[x] = val;
                 break;

            case 0x8000:

                 switch (opcode & 0x000f) {

                     // LD Vx, Vy
                     // 8xy0
                     // Stores register Vy in Vx
                     case 0x0000:
                         this.v[x] = this.v[y];
                         break;

                     // OR Vx, Vy
                     // 8xu1
                     // Set vX equal to vX OR Vy;
                     case 0x0001:
                         this.v[x] |= this.v[y];
                         break;

                     // AND Vx, Vy
                     // 8xy2
                     // Set Vx equal to Vx AMD Vy
                     case 0x0002:
                         this.v[x] &= this.v[y];
                         break;

                     // XOR Vx, Vy
                     // 8xy3
                     // Set Vx equal to Vx XOR Vy.
                     case 0x0003:
                         this.v[x] ^= this.v[y];
                         break;

                     // ADD Vx, Vy
                     // 8xy4
                     // Set Vx equal to Vx + Vy, set Vf equal to carry.
                     case 0x0004:
                         this.v[x] += this.v[y];
                         this.v[0xF] = +(this.v[x] > 255);
                         if (this.v[x] > 255) {
                             this.v[x] -= 256;
                         }
                         break;

                     // SUB Vx, Vy
                     // 8xy5
                     // Set Vx equal to Vx - Vy, set Vf equal to NOT borrow.
                     case 0x0005:
                         this.v[0xF] = +(this.v[x] > this.v[y]);
                         this.v[x] -= this.v[y];
                         if (this.v[x] < 0) {
                             this.v[x] += 256;
                         }
                         break;

                     // SHR Vx, Vy
                     // 8xy6
                     // Set Vx SHR 1.
                     case 0x0006:
                         this.v[0xF] = this.v[x] & 0x1;
                         this.v[x] >>= 1;
                         break;

                     // SUBN Vx, Vy
                     // 8xy7
                     // Set Vx equal to Vy - Vx, set Vf equal to NOT borrow.
                     case 0x0007:
                         this.v[0xF] = +(this.v[y] > this.v[x]);
                         this.v[x] = this.v[y] - this.v[x];
                         if (this.v[x] < 0) {
                             this.v[x] += 256;
                         }
                         break;


                     // SHL Vx, Vy
                     // 8xyE
                     // Set Vx equal to Vx SHL 1.
                     case 0x000E:
                         this.v[0xF] = +(this.v[x] & 0x80);
                         this.v[x] <<= 1;
                         if (this.v[x] > 255) {
                             this.v[x] -= 256;
                         }
                         break;

                 }

                 break;

             // SNE Vx, Vy
             // 9xy0
             // Skip next instruction if Vx is not equal to Vy.
             case 0x9000:
                 if (this.v[x] != this.v[y]) {
                     this.pc += 2;
                 }
                 break;

             // LD I, addr
             // Annn
             // Set I equal to nnn.
             case 0xA000:
                 this.i = opcode & 0xFFF;
                 break;

             // JP V0, addr
             // Bnnn
             // Jump to location V0 + nnn.
             case 0xB000:
                 this.pc = (opcode & 0xFFF) + this.v[0];
                 break;

             // RND Vx, byte
             // Cxkk
             // Set Vx equal to random byte AND kk.
             case 0xC000:
                 this.v[x] = Math.floor(Math.random() * 0xFF) & (opcode & 0xFF)
                 break;

             // DRW Vx, Vy, nibble
             // Dxyn
             // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF equal to collision.
             case 0xD000:
                 this.v[0xF] = 0;

                 var height = opcode & 0x000F;
                 var registerX = this.v[x];
                 var registerY = this.v[y];
                 var x, y, spr;

                 for (y = 0; y < height; y++) {
                     spr = this.memory[this.i + y];
                     for (x = 0; x < 8; x++) {
                         if ((spr & 0x80) > 0) {
                             if (this.setPixel(registerX + x, registerY + y)) {
                                 this.v[0xF] = 1;
                             }
                         }
                         spr <<= 1;
                     }
                 }
                 this.drawFlag = true;

                 break;

             case 0xE000:
                 switch (opcode & 0x00FF) {

                     // SKP Vx
                     // Ex9E
                     // Skip next instruction if the key with the value Vx is pressed.
                     case 0x009E:
                         if (this.keys[this.v[x]]) {
                             this.pc += 2;
                         }
                         break;

                     // SKNP Vx
                     // ExA1
                     // Skip  next instruction if the key with the value Vx is NOT pressed.
                     case 0x00A1:
                         if (!this.keys[this.v[x]]) {
                             this.pc += 2;
                         }
                         break;

                 }

                 break;

             case 0xF000:

                 switch (opcode & 0x00FF) {

                     // LD Vx, DT
                     // Fx07
                     // Place value of DT in Vx.
                     case 0x0007:
                         this.v[x] = this.delayTimer;
                         break;

                     // LD Vx, K
                     // Fx0A
                     // Wait for keypress, then store it in Vx.
                     case 0x000A:

                         var oldKeyDown = this.setKey;
                         var self = this;

                         this.setKey = function(key) {
                            self.v[x] = key;

                            self.setKey = oldKeyDown.bind(self);
                            self.setKey.apply(self, arguments);

                            self.start();
                         }

                         this.stop();
                         return;

                     // LD DT, Vx
                     // Fx15
                     // DT is set to Vx.
                     case 0x0015:
                         this.delayTimer = this.v[x];
                         break;

                     // LD ST, Vx
                     // Fx18
                     // Set sound timer to Vx.
                     case 0x0018:
                         this.soundTimer = this.v[x];
                         break;

                     // ADD I, Vx
                     // Fx1E
                     // Set I equal to I + Vx
                     case 0x001E:
                         this.i += this.v[x];
                         break;

                     // LD F, Vx
                     // Fx29
                     // Set I equal to location of sprite for digit Vx.
                     case 0x0029:
                         // Multiply by number of rows per character.
                         this.i = this.v[x] * 5;
                         break;

                     // LD B, Vx
                     // Fx33
                     // Store BCD representation of Vx in memory location starting at location I.
                     case 0x0033:
                         var number = this.v[x], i;

                         for (i = 3; i > 0; i--) {
                             this.memory[this.i + i - 1] = parseInt(number % 10);
                             number /= 10;
                         }
                         break;

                     // LD [I], Vx
                     // Fx55
                     // Store registers V0 through Vx in memory starting at location I.
                     case 0x0055:
                         for (var i = 0; i <= x; i++) {
                             this.memory[this.i + i] = this.v[i];
                         }
                         break;

                     // LD Vx, [I]
                     // Fx65
                     // Read registers V0 through Vx from memory starting at location I.
                     case 0x0065:
                         for (var i = 0; i <= x; i++) {
                             this.v[i] = this.memory[this.i + i];
                         }
                         break;

             }

             break;

         default:
             throw new Error("Unknown opcode " + opcode.toString(16) + " passed. Terminating.");
         }

     }
};
