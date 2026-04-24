export class ResponseMessage<T> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly message?: string,
    public readonly error?: string,
  ) {}
}
