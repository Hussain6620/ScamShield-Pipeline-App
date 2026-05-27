pipeline {
    agent any

    environment {
        APP_NAME = 'scamshield-pipeline-app'
        IMAGE_TAG = "${BUILD_NUMBER}"

        STAGING_CONTAINER = 'scamshield-staging'
        STAGING_PORT = '3001'

        PRODUCTION_CONTAINER = 'scamshield-production'
        PRODUCTION_PORT = '3000'

        MONITORING_NETWORK = 'scamshield-monitoring'
        PROMETHEUS_CONTAINER = 'scamshield-prometheus'
        PROMETHEUS_PORT = '9090'
        ALERTMANAGER_CONTAINER = 'scamshield-alertmanager'
        ALERTMANAGER_PORT = '9093'
    }

    stages {
        stage('Environment Check') {
            steps {
                echo 'Checking tools required for the pipeline...'
                bat 'git --version'
                bat 'node -v'
                bat 'npm -v'
                bat 'docker version'
            }
        }

        stage('Build') {
            steps {
                echo 'Installing Node.js dependencies...'
                bat 'npm ci'

                echo 'Building Docker image artefact...'
                bat 'docker build -t %APP_NAME%:%IMAGE_TAG% .'

                echo 'Displaying available ScamShield Docker images...'
                bat 'docker images %APP_NAME%'
            }
        }

        stage('Test') {
            steps {
                echo 'Running automated Jest and Supertest tests...'
                bat 'npm test'
            }
        }

        stage('Code Quality') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    echo 'Running SonarQube code quality analysis...'

                    withSonarQubeEnv('LocalSonarQube') {
                        bat "\"${scannerHome}\\bin\\sonar-scanner.bat\" -Dsonar.projectVersion=%BUILD_NUMBER%"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo 'Waiting for the SonarQube Quality Gate result...'

                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Security') {
            steps {
                echo 'Preparing security report folder...'
                bat 'if exist security-reports rmdir /s /q security-reports'
                bat 'mkdir security-reports'

                script {
                    echo 'Running npm dependency vulnerability audit...'

                    def npmAuditStatus = bat(
                        returnStatus: true,
                        script: 'npm audit --audit-level=high > security-reports\\npm-audit-report.txt'
                    )

                    bat 'type security-reports\\npm-audit-report.txt'

                    if (npmAuditStatus != 0) {
                        error('Security gate failed: npm audit found a high severity dependency vulnerability or the audit command failed.')
                    }

                    echo 'Running Trivy scan on the Docker image...'

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

                echo 'Security checks completed successfully.'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying the verified image to the staging environment...'

                bat 'docker rm -f %STAGING_CONTAINER% >nul 2>&1 || echo No previous staging container to remove.'

                bat 'docker run -d --name %STAGING_CONTAINER% -p %STAGING_PORT%:3000 %APP_NAME%:%IMAGE_TAG%'

                bat 'docker ps --filter "name=%STAGING_CONTAINER%"'

                script {
                    echo 'Checking whether the staging application is healthy...'

                    def stagingHealthStatus = bat(
                        returnStatus: true,
                        script: '''
                            @echo off
                            for /L %%i in (1,1,10) do (
                                curl.exe --fail --silent --show-error http://localhost:%STAGING_PORT%/health && exit /b 0
                                echo Waiting for staging application to start...
                                ping 127.0.0.1 -n 3 >nul
                            )
                            exit /b 1
                        '''
                    )

                    if (stagingHealthStatus != 0) {
                        echo 'Staging health check failed. Displaying container logs...'
                        bat 'docker logs %STAGING_CONTAINER%'
                        error('Deployment failed: the staging application health endpoint did not respond successfully.')
                    }
                }

                echo 'Staging deployment completed successfully.'
            }
        }

        stage('Release') {
            steps {
                echo 'Promoting the verified staging image to production...'

                bat 'docker tag %APP_NAME%:%IMAGE_TAG% %APP_NAME%:v1.0.%BUILD_NUMBER%'

                echo 'Displaying the versioned production image...'
                bat 'docker images %APP_NAME%'

                bat 'docker rm -f %PRODUCTION_CONTAINER% >nul 2>&1 || echo No previous production container to remove.'
                bat 'docker rm -f scamshield-local >nul 2>&1 || echo No earlier local test container to remove.'

                bat 'docker run -d --name %PRODUCTION_CONTAINER% -p %PRODUCTION_PORT%:3000 -e NODE_ENV=production %APP_NAME%:v1.0.%BUILD_NUMBER%'

                bat 'docker ps --filter "name=%PRODUCTION_CONTAINER%"'

                script {
                    echo 'Checking whether the production application is healthy...'

                    def productionHealthStatus = bat(
                        returnStatus: true,
                        script: '''
                            @echo off
                            for /L %%i in (1,1,10) do (
                                curl.exe --fail --silent --show-error http://localhost:%PRODUCTION_PORT%/health && exit /b 0
                                echo Waiting for production application to start...
                                ping 127.0.0.1 -n 3 >nul
                            )
                            exit /b 1
                        '''
                    )

                    if (productionHealthStatus != 0) {
                        echo 'Production health check failed. Displaying container logs...'
                        bat 'docker logs %PRODUCTION_CONTAINER%'
                        error('Release failed: the production application health endpoint did not respond successfully.')
                    }
                }

                echo 'Production release completed successfully.'
            }
        }

        stage('Monitoring and Alerting') {
            steps {
                echo 'Preparing monitoring evidence folder...'
                bat 'if exist monitoring-reports rmdir /s /q monitoring-reports'
                bat 'mkdir monitoring-reports'

                echo 'Creating the monitoring Docker network if it does not already exist...'
                bat 'docker network inspect %MONITORING_NETWORK% >nul 2>&1 || docker network create %MONITORING_NETWORK%'

                echo 'Checking the Prometheus configuration files...'
                bat '''
                    docker run --rm ^
                    --entrypoint /bin/promtool ^
                    -v "%CD%\\monitoring\\prometheus.yml:/etc/prometheus/prometheus.yml:ro" ^
                    -v "%CD%\\monitoring\\alert-rules.yml:/etc/prometheus/alert-rules.yml:ro" ^
                    prom/prometheus:v3.5.3 ^
                    check config /etc/prometheus/prometheus.yml
                '''

                echo 'Removing older monitoring containers...'
                bat 'docker rm -f %PROMETHEUS_CONTAINER% >nul 2>&1 || echo No previous Prometheus container to remove.'
                bat 'docker rm -f %ALERTMANAGER_CONTAINER% >nul 2>&1 || echo No previous Alertmanager container to remove.'

                echo 'Starting Alertmanager...'
                bat '''
                    docker run -d ^
                    --name %ALERTMANAGER_CONTAINER% ^
                    --network %MONITORING_NETWORK% ^
                    -p %ALERTMANAGER_PORT%:9093 ^
                    -v "%CD%\\monitoring\\alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro" ^
                    prom/alertmanager:v0.32.1 ^
                    --config.file=/etc/alertmanager/alertmanager.yml
                '''

                echo 'Starting Prometheus...'
                bat '''
                    docker run -d ^
                    --name %PROMETHEUS_CONTAINER% ^
                    --network %MONITORING_NETWORK% ^
                    -p %PROMETHEUS_PORT%:9090 ^
                    -v "%CD%\\monitoring\\prometheus.yml:/etc/prometheus/prometheus.yml:ro" ^
                    -v "%CD%\\monitoring\\alert-rules.yml:/etc/prometheus/alert-rules.yml:ro" ^
                    prom/prometheus:v3.5.3 ^
                    --config.file=/etc/prometheus/prometheus.yml ^
                    --web.enable-lifecycle
                '''

                script {
                    echo 'Checking whether Prometheus and Alertmanager are ready...'

                    def monitoringStatus = bat(
                        returnStatus: true,
                        script: '''
                            @echo off
                            for /L %%i in (1,1,10) do (
                                curl.exe --fail --silent --show-error http://localhost:%PROMETHEUS_PORT%/-/ready >nul 2>&1 && (
                                    curl.exe --fail --silent --show-error http://localhost:%ALERTMANAGER_PORT%/-/ready >nul 2>&1 && exit /b 0
                                )
                                echo Waiting for monitoring services to start...
                                ping 127.0.0.1 -n 3 >nul
                            )
                            exit /b 1
                        '''
                    )

                    if (monitoringStatus != 0) {
                        echo 'Monitoring services failed to start. Displaying logs...'
                        bat 'docker logs %PROMETHEUS_CONTAINER%'
                        bat 'docker logs %ALERTMANAGER_CONTAINER%'
                        error('Monitoring failed: Prometheus or Alertmanager is not ready.')
                    }
                }

                echo 'Saving monitoring evidence from the running services...'
                bat 'curl.exe --fail --silent --show-error http://localhost:%PROMETHEUS_PORT%/api/v1/targets > monitoring-reports\\prometheus-targets.json'
                bat 'curl.exe --fail --silent --show-error http://localhost:%ALERTMANAGER_PORT%/api/v2/status > monitoring-reports\\alertmanager-status.json'

                echo 'Showing running deployment and monitoring containers...'
                bat 'docker ps --filter "name=scamshield"'

                echo 'Monitoring and alerting services started successfully.'
            }
        }
    }

    post {
        always {
            echo 'Archiving pipeline evidence files...'
            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'security-reports/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'monitoring-reports/**/*', allowEmptyArchive: true
        }

        success {
            echo 'All seven required DevOps pipeline stages completed successfully.'
        }

        failure {
            echo 'The pipeline failed. Review the failed stage in the Jenkins console output.'
        }
    }
}