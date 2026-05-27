pipeline {
    agent any

    environment {
        APP_NAME = 'scamshield-pipeline-app'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Environment Check') {
            steps {
                bat 'git --version'
                bat 'node -v'
                bat 'npm -v'
                bat 'docker version'
            }
        }

        stage('Build') {
            steps {
                bat 'npm ci'
                bat 'docker build -t %APP_NAME%:%IMAGE_TAG% .'
                bat 'docker images %APP_NAME%'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Code Quality') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('LocalSonarQube') {
                        bat "\"${scannerHome}\\bin\\sonar-scanner.bat\" -Dsonar.projectVersion=%BUILD_NUMBER%"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

        stage('Security') {
            steps {
                bat 'if not exist security-reports mkdir security-reports'

                script {
                    echo 'Running npm dependency security audit...'

                    def npmAuditStatus = bat(
                        returnStatus: true,
                        script: 'npm audit --audit-level=high > security-reports\\npm-audit-report.txt'
                    )

                    bat 'type security-reports\\npm-audit-report.txt'

                    if (npmAuditStatus != 0) {
                        error('Security gate failed: npm audit found a high severity dependency vulnerability.')
                    }

                    echo 'Running Trivy Docker image vulnerability scan...'

                    def trivyStatus = bat(
                        returnStatus: true,
                        script: '''
                            docker run --rm ^
                            -v /var/run/docker.sock:/var/run/docker.sock ^
                            -v trivy-cache:/root/.cache/ ^
                            aquasec/trivy:0.70.0 image ^
                            --scanners vuln ^
                            --severity HIGH,CRITICAL ^
                            --ignore-unfixed ^
                            --exit-code 1 ^
                            --format table ^
                            %APP_NAME%:%IMAGE_TAG% > security-reports\\trivy-report.txt
                        '''
                    )

                    bat 'type security-reports\\trivy-report.txt'

                    if (trivyStatus != 0) {
                        error('Security gate failed: Trivy found a high or critical vulnerability in the Docker image.')
                    }
                }
            }
        }

        post {
        always {
            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'security-reports/**/*', allowEmptyArchive: true
        }

        success {
            echo 'Build, testing and code quality analysis completed successfully.'
        }

        failure {
            echo 'The pipeline failed. Review the failed stage before continuing.'
        }
    }
}