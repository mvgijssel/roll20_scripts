import Base from "./Base";

export default class Character extends Base {
  constructor(charObj, template = null) {
    super(charObj);

    if (template) {
      this.template = template;
    }

    this.attributes = {};
  }

  addAttributes(newAttributes) {
    _.flatten(newAttributes).forEach((attribute) => {
      this.attributes[attribute.name] = attribute;
    });
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  get attributeArray() {
    return Object.keys(this.attributes).map(
      (attributeName) => this.attributes[attributeName]
    );
  }
}
