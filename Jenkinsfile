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

    post {
        always {
            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
        }

        success {
            echo 'Build, testing and code quality analysis completed successfully.'
        }

        failure {
            echo 'The pipeline failed. Review the failed stage before continuing.'
        }
    }
}