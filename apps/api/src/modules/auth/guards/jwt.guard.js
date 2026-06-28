"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Public = void 0;
var common_1 = require("@nestjs/common");
var Public = function () { return (0, common_1.SetMetadata)('isPublic', true); };
exports.Public = Public;
