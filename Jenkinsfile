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
                        echo "PR URL: ${env.CHANGE_URL ?: 'N/A'}"
                        echo "PR Target: ${env.CHANGE_TARGET ?: 'N/A'}"
                        echo "Branch Name: ${env.BRANCH_NAME ?: 'N/A'}"
                        echo "PR Author Display Name: ${env.CHANGE_AUTHOR_DISPLAY_NAME ?: 'N/A'}"
                        echo "PR Author Email: ${env.CHANGE_AUTHOR_EMAIL ?: 'N/A'}"

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

                    // Try multiple sources for PR description
                    def prDescription = ''

                    // Method 1: Try env.CHANGE_DESCRIPTION
                    if (env.CHANGE_DESCRIPTION) {
                        prDescription = env.CHANGE_DESCRIPTION
                        echo "✅ Got PR description from env.CHANGE_DESCRIPTION"
                    }
                    // Method 2: Try to fetch from GitHub API using curl
                    else if (env.CHANGE_ID && env.CHANGE_URL) {
                        echo "⚠️ env.CHANGE_DESCRIPTION is empty, trying to fetch from GitHub API..."
                        try {
                            // Extract owner and repo from CHANGE_URL
                            // Example: https://github.com/owner/repo/pull/123
                            def changeUrl = env.CHANGE_URL
                            echo "PR URL: ${changeUrl}"

                            // Parse owner/repo from URL (e.g., https://github.com/rachitb99/new_fastapi_base/pull/18)
                            def urlParts = changeUrl.tokenize('/')
                            def owner = urlParts[3]  // rachitb99
                            def repo = urlParts[4]   // new_fastapi_base

                            echo "Fetching PR description from GitHub API for ${owner}/${repo} PR #${env.CHANGE_ID}"

                            // Use GitHub API to fetch PR description
                            def apiUrl = "https://api.github.com/repos/${owner}/${repo}/pulls/${env.CHANGE_ID}"
                            def curlResult = sh(
                                script: """
                                    curl -s -H 'Accept: application/vnd.github.v3+json' '${apiUrl}' | \
                                    grep -o '"body":"[^"]*"' | \
                                    sed 's/"body":"\\(.*\\)"/\\1/' | \
                                    sed 's/\\\\n/\\n/g' | \
                                    sed 's/\\\\r//g' | \
                                    head -1
                                """,
                                returnStdout: true
                            ).trim()

                            if (curlResult && curlResult != '') {
                                prDescription = curlResult
                                echo "✅ Got PR description from GitHub API via curl"
                            } else {
                                echo "⚠️ GitHub API returned empty description"
                            }
                        } catch (Exception e) {
                            echo "⚠️ Could not fetch PR description from GitHub API: ${e.message}"
                        }
                    }

                    echo "Final PR Description: ${prDescription}"

                    if (prDescription.trim().isEmpty()) {
                        echo "⚠️ PR description is empty!"
                        echo ""
                        echo "To run tests, add this to your PR description:"
                        echo '  "run_tests": true'
                        echo '  "run_tests_on": ["cart", "returns"]'
                        echo ""
                        echo "Example PR description:"
                        echo "  This PR adds new feature X"
                        echo ""
                        echo '  "run_tests": true'
                        echo '  "run_tests_on": ["cart", "returns"]'
                        echo ""
                        env.RUN_TESTS = 'false'
                        env.TESTS_TO_RUN = ''
                    } else {
                        echo "Parsing test configuration from description..."

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

                        echo "✅ RUN_TESTS: ${env.RUN_TESTS}"
                        echo "✅ TESTS_TO_RUN: ${env.TESTS_TO_RUN}"

                        if (env.RUN_TESTS != 'true') {
                            echo "⚠️ Tests are disabled. Set \"run_tests\": true in PR description to enable."
                        }
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
