import Joi from 'joi';
export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin', 'manager', 'viewer').default('user')
});
export const userUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    role: Joi.string().valid('user', 'admin', 'manager', 'viewer')
});
export const easypayClientSchema = Joi.object({
    client_id: Joi.string().required(),
    display_name: Joi.string().required(),
    ssn: Joi.string().allow(''),
    is_resident: Joi.string().allow(''),
    password: Joi.string().allow(''),
    pin: Joi.string().allow(''),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    address: Joi.string().allow(''),
    date_of_birth: Joi.string().allow(''),
    is_enabled: Joi.string().allow(''),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    phone2: Joi.string().allow(''),
    gender: Joi.string().allow(''),
    language: Joi.string().allow(''),
    phone_verified: Joi.string().allow(''),
    email_verified: Joi.string().allow(''),
    open_date: Joi.string().allow(''),
    is_verified: Joi.string().allow(''),
    ordered_registration: Joi.string().allow(''),
    verification_date: Joi.string().allow(''),
    registration_type: Joi.string().allow('')
});
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=validation.js.map