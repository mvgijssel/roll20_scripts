import Base from "./Base";

export default class Attribute extends Base {
  constructor(originalAttribute, castType = null) {
    super(originalAttribute);

    if (castType) {
      this._castType = castType;
    }
  }

  get current() {
    return castValue(this.fields.current, this._castType);
  }

  get max() {
    return castValue(this.fields.max, this._castType);
  }
}
