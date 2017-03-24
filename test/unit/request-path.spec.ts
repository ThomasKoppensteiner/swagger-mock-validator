import {expectToReject, willResolve} from 'jasmine-promise-tools';
import {customMatchers, CustomMatchers} from './support/custom-jasmine-matchers';
import {interactionBuilder, pactBuilder} from './support/pact-builder';
import {
    operationBuilder,
    PathBuilder,
    pathBuilder,
    pathParameterBuilder,
    swaggerBuilder
} from './support/swagger-builder';
import swaggerPactValidatorLoader from './support/swagger-mock-validator-loader';

declare function expect<T>(actual: T): CustomMatchers<T>;

describe('request path', () => {
    const expectedFailedValidationError =
        new Error('Mock file "pact.json" is not compatible with swagger file "swagger.json"');

    const defaultSwaggerPathBuilder = pathBuilder.withGetOperation(operationBuilder);

    const invokeValidatorWithPath = (swaggerPath: PathBuilder, pactValue: string) => {
        const pactFile = pactBuilder
            .withInteraction(interactionBuilder
                .withDescription('interaction description')
                .withRequestPath(`/${pactValue}`)
            )
            .build();

        const swaggerFile = swaggerBuilder
            .withPath('/{value}', swaggerPath)
            .build();

        return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);
    };

    beforeEach(() => {
        jasmine.addMatchers(customMatchers);
    });

    it('should pass when the pact path matches a path defined in the swagger', willResolve(() => {
        const pactFile = pactBuilder
            .withInteraction(interactionBuilder.withRequestPath('/does/exist'))
            .build();

        const swaggerFile = swaggerBuilder
            .withPath('/does/exist', pathBuilder.withGetOperation(operationBuilder))
            .build();

        return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
            (expect(result) as any).toContainNoWarnings();
        });
    }));

    it('should return the error when a pact calls a path that is not defined in the swagger', willResolve(() => {
        const pactFile = pactBuilder
            .withInteraction(interactionBuilder
                .withState('a-state')
                .withDescription('interaction description')
                .withRequestPath('/does/not/exist')
            )
            .build();

        const swaggerFile = swaggerBuilder.build();

        const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

        return expectToReject(result).then((error) => {
            expect(error).toEqual(expectedFailedValidationError);
            expect(error.details).toContainErrors([{
                code: 'spv.request.path-or-method.unknown',
                message: 'Path or method not defined in swagger file: GET /does/not/exist',
                mockDetails: {
                    interactionDescription: 'interaction description',
                    interactionState: 'a-state',
                    location: '[pactRoot].interactions[0].request.path',
                    mockFile: 'pact.json',
                    value: '/does/not/exist'
                },
                source: 'spec-mock-validation',
                specDetails: {
                    location: '[swaggerRoot].paths',
                    pathMethod: null,
                    pathName: null,
                    specFile: 'swagger.json',
                    value: {}
                },
                type: 'error'
            }]);
        });
    }));

    it('should return the error with the state when a pact file is using legacy provider_state', willResolve(() => {
        const pactFile = pactBuilder
            .withInteraction(interactionBuilder
                .withStateLegacy('a-state')
                .withDescription('interaction description')
                .withRequestPath('/does/not/exist')
            )
            .build();

        const swaggerFile = swaggerBuilder.build();

        const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

        return expectToReject(result).then((error) => {
            expect(error).toEqual(expectedFailedValidationError);
            expect(error.details).toContainErrors([{
                code: 'spv.request.path-or-method.unknown',
                message: 'Path or method not defined in swagger file: GET /does/not/exist',
                mockDetails: {
                    interactionDescription: 'interaction description',
                    interactionState: 'a-state',
                    location: '[pactRoot].interactions[0].request.path',
                    mockFile: 'pact.json',
                    value: '/does/not/exist'
                },
                source: 'spec-mock-validation',
                specDetails: {
                    location: '[swaggerRoot].paths',
                    pathMethod: null,
                    pathName: null,
                    specFile: 'swagger.json',
                    value: {}
                },
                type: 'error'
            }]);
        });
    }));

    describe('partial matching', () => {
        it('should return the error when a pact path partially matches a shorter swagger spec', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/almost/matches')
                )
                .build();

            const swaggerFile = swaggerBuilder
                .withPath('/almost', pathBuilder)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /almost/matches',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/almost/matches'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/almost': {}}
                    },
                    type: 'error'
                }]);
            });
        }));

        it('should return the error when a pact path partially matches a longer swagger spec', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/almost')
                )
                .build();

            const swaggerFile = swaggerBuilder
                .withPath('/almost/matches', pathBuilder)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /almost',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/almost'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/almost/matches': {}}
                    },
                    type: 'error'
                }]);
            });
        }));

        it('should return the error when a pact partially matches a swagger spec with params', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/almost')
                )
                .build();

            const swaggerPathBuilder = pathBuilder
                .withGetOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')));

            const swaggerFile = swaggerBuilder
                .withPath('/almost/matches/{userId}', swaggerPathBuilder)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /almost',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/almost'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/almost/matches/{userId}': swaggerPathBuilder.build()}
                    },
                    type: 'error'
                }]);
            });
        }));
    });

    describe('location of parameter definitions', () => {
        it('should pass when the parameter is defined on the operation object', willResolve(() => {
            const pactFile = pactBuilder.withInteraction(interactionBuilder.withRequestPath('/users/1')).build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withGetOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')))
                )
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when the parameter is defined on the operation object for a post', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder.withRequestPath('/users/1').withRequestMethodPost())
                .build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withPostOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')))
                )
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when the parameter is defined on the path item object', willResolve(() => {
            const pactFile = pactBuilder.withInteraction(interactionBuilder.withRequestPath('/users/1')).build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withParameter(pathParameterBuilder.withNumberNamed('userId'))
                    .withGetOperation(operationBuilder)
                )
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when the parameter is defined on the swagger object', willResolve(() => {
            const pactFile = pactBuilder.withInteraction(interactionBuilder.withRequestPath('/users/1')).build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withParameterReference('userId')
                    .withGetOperation(operationBuilder)
                )
                .withParameter('userId', pathParameterBuilder.withNumberNamed('userId'))
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should use the operation parameters when there are duplicate parameter definitions', willResolve(() => {
            const pactFile = pactBuilder.withInteraction(interactionBuilder.withRequestPath('/users/1')).build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withGetOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')))
                    .withParameter(pathParameterBuilder.withBooleanNamed('userId'))
                )
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should use path parameters when operation parameters are defined on a different method', willResolve(() => {
            const pactFile = pactBuilder.withInteraction(interactionBuilder.withRequestPath('/users/1')).build();

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId}', pathBuilder
                    .withPostOperation(operationBuilder.withParameter(pathParameterBuilder.withBooleanNamed('userId')))
                    .withGetOperation(operationBuilder)
                    .withParameter(pathParameterBuilder.withNumberNamed('userId'))
                )
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));
    });

    describe('parameter types', () => {
        describe('number parameters', () => {
            const swaggerPathWithNumberParameterBuilder = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withNumberNamed('value'));

            it('should pass when the pact path matches a number param defined in the swagger', willResolve(() =>
                invokeValidatorWithPath(swaggerPathWithNumberParameterBuilder, '1.1').then((result) => {
                    (expect(result) as any).toContainNoWarnings();
                })
            ));

            it('should return the error when a pact path has an incorrect type as a number param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithNumberParameterBuilder, 'foo');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /foo',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/foo'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithNumberParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));

            it('should return the error when a pact path has no value as a number param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithNumberParameterBuilder, '');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithNumberParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));
        });

        describe('boolean parameters', () => {
            const swaggerPathWithBooleanParameterBuilder = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withBooleanNamed('value'));

            it('should pass when the pact path matches a boolean param defined in the swagger', willResolve(() =>
                invokeValidatorWithPath(swaggerPathWithBooleanParameterBuilder, 'true').then((result) => {
                    (expect(result) as any).toContainNoWarnings();
                })
            ));

            it('should return the error when a pact has an incorrect type as a boolean param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithBooleanParameterBuilder, 'on');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /on',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/on'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithBooleanParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));
        });

        describe('string parameters', () => {
            const swaggerPathWithStringParameterBuilder = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withStringNamed('value'));

            it('should pass when the pact path matches a string param defined in the swagger', willResolve(() =>
                invokeValidatorWithPath(swaggerPathWithStringParameterBuilder, 'jira').then((result) => {
                    (expect(result) as any).toContainNoWarnings();
                })
            ));

            it('should return the error when a pact path has no value as a string param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithStringParameterBuilder, '');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithStringParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));
        });

        describe('integer parameters', () => {
            const swaggerPathWithIntegerParameterBuilder = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withIntegerNamed('value'));

            it('should pass when the pact path matches a integer param defined in the swagger', willResolve(() =>
                invokeValidatorWithPath(swaggerPathWithIntegerParameterBuilder, '1').then((result) => {
                    (expect(result) as any).toContainNoWarnings();
                })
            ));

            it('should return the error when a pact path has an incorrect type as a integer param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithIntegerParameterBuilder, '1.1');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /1.1',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/1.1'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithIntegerParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));

            it('should return the error when a pact path has no value as a integer param', willResolve(() => {
                const result = invokeValidatorWithPath(swaggerPathWithIntegerParameterBuilder, '');

                return expectToReject(result).then((error) => {
                    expect(error).toEqual(expectedFailedValidationError);
                    expect(error.details).toContainErrors([{
                        code: 'spv.request.path-or-method.unknown',
                        message: 'Path or method not defined in swagger file: GET /',
                        mockDetails: {
                            interactionDescription: 'interaction description',
                            interactionState: '[none]',
                            location: '[pactRoot].interactions[0].request.path',
                            mockFile: 'pact.json',
                            value: '/'
                        },
                        source: 'spec-mock-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: {'/{value}': swaggerPathWithIntegerParameterBuilder.build()}
                        },
                        type: 'error'
                    }]);
                });
            }));
        });
    });

    describe('array params', () => {
        it('should pass when a pact path has a correct type as an array param with default commas', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1,2,3').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when a pact path has a correct type as an array param with commas', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberCommaSeparatedNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1,2,3').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when a pact path has a correct type as an array param with spaces', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberSpaceSeparatedNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1 2 3').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when a pact path has a correct type as an array param with tabs', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberTabSeparatedNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1\t2\t3').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when a pact path has a correct type as an array param with pipes', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberPipeSeparatedNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1|2|3').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should pass when a pact path has a correct type as an array param with 2 levels', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfArrayOfNumberTabAndCommaSeparatedNamed('value'));

            return invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, '1,2\t3,4\t5,6').then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should return the error when a pact path has an incorrect type as an array param', willResolve(() => {
            const swaggerPathWithArrayOfNumbersParameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfNumberNamed('value'));

            const result = invokeValidatorWithPath(swaggerPathWithArrayOfNumbersParameter, 'a,b,c');

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /a,b,c',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/a,b,c'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/{value}': swaggerPathWithArrayOfNumbersParameter.build()}
                    },
                    type: 'error'
                }]);
            });
        }));

        it('should return the error when a pact path has incorrect type as an array of int32 param', willResolve(() => {
            const swaggerPathWithArrayOfInt32Parameter = defaultSwaggerPathBuilder
                .withParameter(pathParameterBuilder.withArrayOfInt32Named('value'));

            const maxInt32 = Math.pow(2, 31) - 1;
            const maxInt32PlusOne = maxInt32 + 1;
            const pactValue = `${maxInt32},${maxInt32PlusOne}`;

            const result = invokeValidatorWithPath(swaggerPathWithArrayOfInt32Parameter, pactValue);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: `Path or method not defined in swagger file: GET /${pactValue}`,
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: `/${pactValue}`
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/{value}': swaggerPathWithArrayOfInt32Parameter.build()}
                    },
                    type: 'error'
                }]);
            });
        }));
    });

    describe('multiple parameters', () => {
        it('should validate multiple parameters', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/1/users/a')
                )
                .build();

            const accountIdParameter = pathParameterBuilder.withNumberNamed('accountId');
            const getUserIdPath = pathBuilder
                .withGetOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')))
                .withParameter(accountIdParameter);
            const swaggerFile = swaggerBuilder
                .withPath('/{accountId}/users/{userId}', getUserIdPath)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /1/users/a',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/1/users/a'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/{accountId}/users/{userId}': getUserIdPath.build()}
                    },
                    type: 'error'
                }]);
            });
        }));
    });

    describe('multiple interactions', () => {
        it('should validate multiple interactions', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/1/users/a')
                )
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/a/users/1')
                )
                .build();

            const accountIdParameter = pathParameterBuilder.withNumberNamed('accountId');
            const getUserIdPath = pathBuilder
                .withGetOperation(operationBuilder.withParameter(pathParameterBuilder.withNumberNamed('userId')))
                .withParameter(accountIdParameter);
            const swaggerFile = swaggerBuilder
                .withPath('/{accountId}/users/{userId}', getUserIdPath)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /1/users/a',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/1/users/a'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/{accountId}/users/{userId}': getUserIdPath.build()}
                    },
                    type: 'error'
                }, {
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /a/users/1',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[1].request.path',
                        mockFile: 'pact.json',
                        value: '/a/users/1'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/{accountId}/users/{userId}': getUserIdPath.build()}
                    },
                    type: 'error'
                }]);
            });
        }));
    });

    describe('malformed parameters', () => {
        it('should not treat a path segment starting with a { character as a parameters', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/users/1')
                )
                .build();

            const getUserPath = pathBuilder.withGetOperation(operationBuilder);

            const swaggerFile = swaggerBuilder
                .withPath('/users/{userId', getUserPath)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /users/1',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/users/1'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/users/{userId': getUserPath.build()}
                    },
                    type: 'error'
                }]);
            });
        }));

        it('should not treat a path segment ending with a } character as a parameters', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withDescription('interaction description')
                    .withRequestPath('/users/1')
                )
                .build();

            const getUserPath = pathBuilder.withGetOperation(operationBuilder);

            const swaggerFile = swaggerBuilder
                .withPath('/users/userId}', getUserPath)
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /users/1',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/users/1'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {'/users/userId}': getUserPath.build()}
                    },
                    type: 'error'
                }]);
            });
        }));
    });

    describe('basePath', () => {
        it('should pass when the pact request path matches the swagger base path and path', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder.withRequestPath('/base/path/does/exist'))
                .build();

            const swaggerFile = swaggerBuilder
                .withPath('/does/exist', pathBuilder.withGetOperation(operationBuilder))
                .withBasePath('/base/path')
                .build();

            return swaggerPactValidatorLoader.invoke(swaggerFile, pactFile).then((result) => {
                (expect(result) as any).toContainNoWarnings();
            });
        }));

        it('should return error when pact request path does not match swagger basePath and path', willResolve(() => {
            const pactFile = pactBuilder
                .withInteraction(interactionBuilder
                    .withState('a-state')
                    .withDescription('interaction description')
                    .withRequestPath('/wrong/base/does/exist')
                )
                .build();

            const swaggerFile = swaggerBuilder
                .withPath('/does/exist', pathBuilder.withGetOperation(operationBuilder))
                .withBasePath('/base/path')
                .build();

            const result = swaggerPactValidatorLoader.invoke(swaggerFile, pactFile);

            return expectToReject(result).then((error) => {
                expect(error).toEqual(expectedFailedValidationError);
                expect(error.details).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /wrong/base/does/exist',
                    mockDetails: {
                        interactionDescription: 'interaction description',
                        interactionState: 'a-state',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/wrong/base/does/exist'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {
                            '/does/exist': pathBuilder.withGetOperation(operationBuilder).build()
                        }
                    },
                    type: 'error'
                }]);
            });
        }));
    });
});