import Joi from 'joi';
import type { Request, Response, NextFunction } from 'express';
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const registerSchema: Joi.ObjectSchema<any>;
export declare const userUpdateSchema: Joi.ObjectSchema<any>;
export declare const easypayClientSchema: Joi.ObjectSchema<any>;
export declare const validateRequest: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map