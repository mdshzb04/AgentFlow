import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/graphql/schema.graphql",
  documents: "src/graphql/operations/**/*.graphql",
  generates: {
    "src/graphql/generated/graphql.ts": {
      plugins: ["typescript-operations", "typescript-react-apollo"],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        dedupeFragments: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
        },
        scalars: {
          Date: "string",
          DateTime: "string",
        },
      },
    },
  },
};

export default config;
