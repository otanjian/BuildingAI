module.exports = {
    rootDir: ".",
    testEnvironment: "node",
    testRegex: ".*\\.spec\\.ts$",
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "../../../packages/api/node_modules/ts-jest",
            {
                tsconfig: {
                    module: "CommonJS",
                    moduleResolution: "Node",
                },
            },
        ],
    },
};
