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
                bat 'docker --version'
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
    }

    post {
        always {
            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
        }

        success {
            echo 'ScamShield build and tests completed successfully.'
        }

        failure {
            echo 'The pipeline failed. Check the failed stage in the console output.'
        }
    }
}