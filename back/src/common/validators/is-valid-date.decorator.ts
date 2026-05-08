import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export function IsValidDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isValidDate",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string") return false;
          const date = new Date(value);
          return !Number.isNaN(date.getTime());
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid date`;
        },
      },
    });
  };
}
