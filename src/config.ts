export const schema_array = [
  {
    displayName: "Person Schema",
    description: "This is the schema used for a person.",
    filename: "person.yaml",
    schema: {
      // If YAML file is opened matching this glob
      fileMatch: ["person.yaml"],
      // The following schema will be applied
      schema: {
        type: "object",
        required: [
          "name", "age", "occupation"
        ],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description: "The person's display name",
          },
          age: {
            type: "integer",
            description: "How old is the person in years?",
          },
          occupation: {
            enum: ["Delivery person", "Software engineer", "Astronaut"],
          },
        },
      },
      // And the URI will be linked to as the source.
      uri: "https://example.com/person.json",
    },
  },
  {
    displayName: "Object Schema",
    description: "This is the schema used for an object.",
    filename: "object.yaml",
    schema: {
      // If YAML file is opened matching this glob
      fileMatch: ["object.yaml"],
      // The following schema will be applied
      schema: {
        type: "object",
        properties: {
          object_name: {
            type: "string",
            description: "The Object's display name",
          },
          age: {
            type: "integer",
            description: "How old is the Object in years?",
          },
          occupation: {
            enum: ["Fruit", "Veggie", "Electronics"],
          },
        },
      },
      // And the URI will be linked to as the source.
      uri: "https://example.com/object.json",
    },
  },
]

export const templates = [
  {
    id: "file_template",
    displayName: "File Template",
    description: "Use this template if you want to create a new file.",
    content: "name: Person\nage: 3\noccupation: Astronaut",
    schema: "person.yaml"
  }
]