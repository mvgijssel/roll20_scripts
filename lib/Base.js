export default class Base {
  constructor(fieldObject) {
    // store a copy of the raw attributes into the instance
    this.fields = { ...fieldObject.attributes };
    // the object with the setters and getters from roll20
    this._fieldObject = fieldObject;
    this.changedFields = {};
    this.originalFields = {};
    this.setWithWorker = false;

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) {
          return target[prop];
        }

        if (prop in target.fields) {
          return target.fields[prop];
        }

        return target[prop];
      },

      /* eslint-disable no-param-reassign */
      set: (target, prop, value) => {
        if (prop in target.fields) {
          const previousValue = target.fields[prop];

          // Don't update if the value is the same
          // Always cast to string for comparison to remove difference in data type
          if (String(value) === String(previousValue)) {
            return true;
          }

          // only update the original fields on the first mutation
          // to keep the actual original field after multiple mutations
          if (!(prop in target.originalFields)) {
            target.originalFields[prop] = target.fields[prop];
          }

          target.changedFields[prop] = value;
          target.fields[prop] = value;
        } else {
          target[prop] = value;
        }

        return true;
      },
      /* eslint-disable no-param-reassign */
    });
  }

  get id() {
    return this.fields._id;
  }

  get hasChanged() {
    return Object.keys(this.changedFields).length > 0;
  }
}
