pipeline {
    agent any

    // Parameters for manual triggering
    parameters {
        string(
            name: 'BRANCH',
            defaultValue: 'main',
            description: 'Branch to test (e.g., main, feat/my-feature)'
        )
        string(
            name: 'TESTS_TO_RUN',
            defaultValue: 'cart,returns',
            description: 'Comma-separated tests: cart, returns, list-returns, or all'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Whether to run tests'
        )
        string(
            name: 'BASE_URL',
            defaultValue: 'http://your-local-ip:8000',
            description: 'Base URL of running FastAPI server (your local machine)'
        )
    }

    // No triggers block - we rely on Multibranch Pipeline webhook
    // This ensures builds only run for PRs, not every push
    options {
        // Disable concurrent builds for the same PR
        disableConcurrentBuilds()
    }

    environment {
        // Environment variables
        PYTHON_VERSION = '3.12'
        VENV_DIR = 'venv'
        TEST_RESULTS_DIR = 'test_results'
    }

    stages {
        stage('Check Build Type') {
            steps {
                script {
                    // Check if this is a PR build
                    if (env.CHANGE_ID) {
                        echo "✅ This is a PR build (PR #${env.CHANGE_ID})"
                        echo "PR Title: ${env.CHANGE_TITLE ?: 'N/A'}"
                        echo "PR Author: ${env.CHANGE_AUTHOR ?: 'N/A'}"
                        env.IS_PR = 'true'
                    } else {
                        echo "⚠️ This is NOT a PR build - it's a regular branch build"
                        echo "Skipping pipeline execution. Only PR builds are supported."
                        env.IS_PR = 'false'
                        // Exit early for non-PR builds
                        currentBuild.result = 'NOT_BUILT'
                        error('This pipeline only runs for Pull Requests. Please create a PR to trigger tests.')
                    }
                }
            }
        }

        stage('Setup Environment') {
            when {
                expression { env.IS_PR == 'true' }
            }
            steps {
                script {
                    // This is a PR build - parse description
                    echo "Parsing PR description for test configuration..."
                    def prDescription = env.CHANGE_DESCRIPTION ?: ''
                    echo "PR Description: ${prDescription}"

                    // Parse run_tests flag
                    def runTestsMatch = prDescription =~ /"run_tests"\s*:\s*true/
                    env.RUN_TESTS = runTestsMatch ? 'true' : 'false'

                    // Parse run_tests_on array
                    def testsOnMatch = prDescription =~ /"run_tests_on"\s*:\s*\[(.*?)\]/
                    if (testsOnMatch) {
                        def testsArray = testsOnMatch[0][1]
                        env.TESTS_TO_RUN = testsArray.replaceAll('["\' ]', '').toLowerCase()
                    } else {
                        env.TESTS_TO_RUN = ''
                    }

                    echo "RUN_TESTS: ${env.RUN_TESTS}"
                    echo "TESTS_TO_RUN: ${env.TESTS_TO_RUN}"

                    if (env.RUN_TESTS != 'true') {
                        echo "⚠️ Tests are disabled. Set \"run_tests\": true in PR description to enable."
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Python Environment') {
            when {
                expression { env.RUN_TESTS == 'true' }
            }
            steps {
                sh '''
                    # Create virtual environment
                   
                    python3 -m venv ${VENV_DIR}

                    # Activate and install only test dependencies
                    . ${VENV_DIR}/bin/activate
                    pip install --upgrade pip
                    pip install httpx  # Only dependency needed for test runner
                '''
            }
        }

        stage('Verify Server Connection') {
            when {
                expression { env.RUN_TESTS == 'true' }
            }
            steps {
                script {
                    sh '''
                        echo "Testing connection to ${BASE_URL}..."

                        # Try to reach the server
                        if curl -s --connect-timeout 5 "${BASE_URL}/manual-test/health" > /dev/null 2>&1; then
                            echo "✅ Successfully connected to server at ${BASE_URL}"
                        else
                            echo "❌ Cannot reach server at ${BASE_URL}"
                            echo "Please ensure:"
                            echo "  1. Your local server is running (uvicorn src.main:app)"
                            echo "  2. BASE_URL parameter is set to your machine's IP"
                            echo "  3. Firewall allows Jenkins to connect"
                            exit 1
                        fi
                    '''
                }
            }
        }

        // stage('Run Manual Tests') {
        //     when {
        //         expression { env.RUN_TESTS == 'true' }
        //     }
        //     steps {
        //         script {
        //             sh '''
        //                 . ${VENV_DIR}/bin/activate

        //                 # Create test results directory
        //                 mkdir -p ${TEST_RESULTS_DIR}

        //                 # Run the test runner script against your local server
        //                 # Use --use-hardcoded-token for faster execution (no auth needed)
        //                 python scripts/run_manual_tests.py \
        //                     --tests "${TESTS_TO_RUN}" \
        //                     --output ${TEST_RESULTS_DIR}/results.json \
        //                     --base-url "${BASE_URL}" \
        //                     --use-hardcoded-token
        //             '''
        //         }
        //     }
        // }

         stage('Run Tests') {
            when {
                expression { env.RUN_TESTS == 'true' }
            }
            steps {
                script {
                    // Use env.TESTS_TO_RUN which is set from PR description or parameters
                    def tests = env.TESTS_TO_RUN.split(',').collect { it.trim() }

                    tests.each { testName ->
                        stage("Test: ${testName}") {
                            sh """
                                . ${VENV_DIR}/bin/activate
                                echo "Running test: ${testName}"

                                python scripts/run_manual_tests.py \
                                    --tests "${testName}" \
                                    --base-url "${params.BASE_URL}" \
                                    --use-hardcoded-token
                            """
                        }
                    }
                }
            }
        }
    

     
    }

    post {
        always {
            script {
                echo 'Tests completed. Server remains running on your local machine.'
            }
        }

        success {
            echo '✅ Pipeline completed successfully!'
            echo 'All tests passed against your local server.'
        }

        failure {
            echo '❌ Pipeline failed!'
            echo 'Check console output for details.'
        }


    }
}
