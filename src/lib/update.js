import Roll20 from "./Roll20";

const preanimatePrefix = (string) => `preanimate_${string}`;

export default (character, writePreanimate) => {
  const messages = [];

  character.attributeArray.forEach((attribute) => {
    const preanimateName = preanimatePrefix(attribute.name);

    if (Roll20.attributeExists(character, preanimateName)) {
      messages.push(`Attribute '${attribute.name}' already updated, skipping.`);
      return;
    }

    const newFields = attribute.changedFields;
    const oldFields = attribute.originalFields;

    if (attribute.hasChanged) {
      messages.push(
        Object.keys(newFields).map(
          (valueName) =>
            `Updated ${valueName} ${attribute.name} from ${oldFields[valueName]} to ${newFields[valueName]}`
        )
      );

      if (attribute.setWithWorker) {
        attribute._fieldObject.setWithWorker(newFields);
      } else {
        attribute._fieldObject.set(newFields);
      }
    }

    if (!writePreanimate) {
      return;
    }

    Roll20.createObj("attribute", {
      ...attribute.fields,
      ...attribute.originalFields,
      name: preanimateName,
    });
  });

  const name = Roll20.findAttribute(character, "npcdrop_name", "string");
  character._fieldObject.set({ name: name.current });

  return _.flatten(messages);
};
