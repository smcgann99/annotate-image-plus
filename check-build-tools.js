const { execSync } = require('child_process');
const os = require('os');

function checkPackage(packageName) {
    try {
        execSync(`dpkg-query -W -f='${packageName}\n' ${packageName}`, { stdio: 'ignore' });
        return true;
    } catch (err) {
        return false;
    }
}

if (os.arch().startsWith('arm')) {
    const requiredPackages = [
        'build-essential',
        'libcairo2-dev',
        'libpango1.0-dev',
        'libjpeg-dev',
        'libgif-dev',
        'librsvg2-dev'
    ];

    const missingPackages = requiredPackages.filter(packageName => !checkPackage(packageName));

    if (missingPackages.length > 0) {
        console.error('Error: The following required build tools are missing:');
        missingPackages.forEach(packageName => console.error(`  - ${packageName}`));
        process.exit(1);
    }
} 