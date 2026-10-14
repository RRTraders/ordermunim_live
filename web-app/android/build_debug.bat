@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
echo JAVA_HOME set to: %JAVA_HOME%
call gradlew.bat assembleDebug 2>&1
