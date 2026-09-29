#!/usr/bin/env node
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import pc from 'picocolors';
import fs from 'fs';

const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];

// Helper pro bezpečné spouštění příkazů (silent režim skryje zbytečné logy APT)
const run = (cmd, silent = false) => {
    try {
        if (!silent) console.log(pc.dim(`    $ ${cmd}`));
        execSync(cmd, { stdio: silent ? 'ignore' : 'inherit' });
    } catch (error) {
        console.error(pc.red(`    [!] Chyba pri vykonavani: ${cmd}`));
        if (!silent) process.exit(1);
    }
};

// --- FUNKCE PRO INSTALACE A NASTAVENÍ ---

const setupBrowser = () => {
    console.log(pc.cyan('\n[*] Instalace: Brave Browser'));
    run('sudo apt-get purge -y firefox* && sudo apt-get autoremove -y', true);
    run('curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg', true);
    run('echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list > /dev/null', true);
    run('sudo apt-get update > /dev/null', true);
    run('sudo apt-get install -y brave-browser');
    run('xdg-settings set default-web-browser brave-browser.desktop', true);
    console.log(pc.green('    [+] Brave Browser uspesne nastaven.'));
};

const setupJava = async () => {
    console.log(pc.cyan('\n[*] Konfigurace: Java Environment'));
    const { javaVersion } = await inquirer.prompt([{
        type: 'list',
        name: 'javaVersion',
        message: 'Vyberte verzi Java (Sipky: hover, Enter: potvrdit):',
        choices: [
            { name: '  Java 21 (Moderni dev, novy Minecraft)', value: 'openjdk-21-jre' },
            { name: '  Java 17 (Minecraft 1.17 - 1.20)', value: 'openjdk-17-jre' },
            { name: '  Java 8  (Legacy aplikace)', value: 'openjdk-8-jre' }
        ]
    }]);
    run(`sudo apt-get install -y ${javaVersion}`);
    console.log(pc.green(`    [+] Verze ${javaVersion} uspesne nainstalovana.`));
};

const setupMacTheme = () => {
    console.log(pc.cyan('\n[*] Konfigurace: macOS Vzhled & Tapeta'));
    // 1. Tlačítka oken doleva
    run(`gsettings set org.cinnamon.desktop.wm.preferences button-layout 'close,minimize,maximize:'`, true);
    
    // 2. Instalace Plank docku (spodní lišta alá Mac)
    run(`sudo apt-get install -y plank > /dev/null`, true);
    const autostartDir = `${process.env.HOME}/.config/autostart`;
    run(`mkdir -p ${autostartDir}`, true);
    run(`echo "[Desktop Entry]\nType=Application\nExec=plank\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\nName=Plank" > ${autostartDir}/plank.desktop`, true);

    // 3. Změna tapety (Stáhne z GitHubu - uprav si URL na svuj repozitar!)
    const wpUrl = 'https://raw.githubusercontent.com/TVUJ_UCET/mineralos/main/assets/tapeta.jpg';
    const wpPath = `${process.env.HOME}/Pictures/tapeta.jpg`;
    run(`mkdir -p ${process.env.HOME}/Pictures`, true);
    run(`curl -sL ${wpUrl} -o ${wpPath}`, true);
    run(`gsettings set org.cinnamon.desktop.background picture-uri "file://${wpPath}"`, true);
    
    console.log(pc.green('    [+] Vzhled macOS (tlacitka vlevo, Plank dock, tapeta) byl aktivovan.'));
};

const setupShortcuts = () => {
    console.log(pc.cyan('\n[*] Konfigurace: Window Management (Zkratky)'));
    // Zápis zkratek do Cinnamon registrů
    run(`gsettings set org.cinnamon.desktop.keybindings.wm push-snap-left "['<Alt><Super>Left']"`, true);
    run(`gsettings set org.cinnamon.desktop.keybindings.wm push-snap-right "['<Alt><Super>Right']"`, true);
    run(`gsettings set org.cinnamon.desktop.keybindings.wm toggle-fullscreen "['<Alt><Super>minus']"`, true);
    
    console.log(pc.green('    [+] Zkratky (Alt+Win+Sipky a Alt+Win+Minus) byly aplikovany.'));
};

const setupVSCode = () => {
    console.log(pc.cyan('\n[*] Instalace: Visual Studio Code'));
    run(`curl -fSsL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /usr/share/keyrings/packages.microsoft.gpg > /dev/null`, true);
    run(`echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list > /dev/null`, true);
    run(`sudo apt-get update > /dev/null`, true);
    run(`sudo apt-get install -y code`, true);
    
    console.log(pc.cyan('    [*] Zpracovavam VS Code profil...'));
    const localProfile = './my-profile.code-profile'; // Očekávaný soubor na USB
    const targetProfile = `${process.env.HOME}/Desktop/my-profile.code-profile`;
    
    if (fs.existsSync(localProfile)) {
        run(`cp ${localProfile} ${targetProfile}`, true);
        console.log(pc.green(`    [+] Tvuj profil byl nalezen a zkopirovan na Plochu.`));
    } else {
        console.log(pc.yellow(`    [!] Soubor '${localProfile}' nenalezen ve slozce.`));
        console.log(pc.dim('        (Pridej ho na USB vedle skriptu a priste se zkopiruje automaticky)'));
    }
    
    console.log(pc.green('    [+] VS Code je pripraven.'));
    console.log(pc.dim('        -> Pro import profilu v aplikaci: File -> Preferences -> Profiles -> Import Profile'));
};


// --- ROUTING PŘÍKAZŮ ---

switch (command) {
    case 'help':
    case undefined:
        console.log(pc.bgWhite(pc.black(' MINERAL OS CLI ')));
        console.log(pc.cyan('\n  Prikazy:'));
        console.log(`  ${pc.bold('mineral help')}                Zobrazi toto menu`);
        console.log(`  ${pc.bold('mineral update')}              Aktualizace nastroje pres NPM`);
        console.log(`  ${pc.bold('mineral setup')}               Interaktivni instalace balicku`);
        console.log(`  ${pc.bold('mineral setup [pkg]')}         Prima instalace (napr. java, theme, vscode)`);
        console.log(`  ${pc.bold('mineral reinstall [pkg]')}     Reinstalace konkretniho balicku z APT`);
        console.log(`  ${pc.bold('mineral minecraft')}           Stazeni a instalace ATLauncher`);
        console.log(`  ${pc.bold('mineral clean')}               Hloubkove cisteni OS a RAM (uvolneni mista)`);
        console.log(`  ${pc.bold('mineral mode [stable|fast]')}  Konfigurace vykonu a optimalizace HW`);
        console.log(`  ${pc.bold('mineral suggest')}             Odeslani navrhu na novy balicek`);
        console.log(`  ${pc.bold('mineral info')}                Informace o nastroji\n`);
        break;

    // ... Zde zůstává zachován kód pro update, info, reinstall, minecraft, clean, mode, suggest (z předchozí zprávy) ...

    case 'setup':
        // Podpora rychlého spuštění např. "mineral setup vscode"
        if (subCommand === 'browser') { setupBrowser(); break; }
        if (subCommand === 'java') { setupJava(); break; }
        if (subCommand === 'theme') { setupMacTheme(); break; }
        if (subCommand === 'shortcuts') { setupShortcuts(); break; }
        if (subCommand === 'vscode') { setupVSCode(); break; }
        if (subCommand) {
            console.log(pc.yellow(`[!] Neznamy setup balicek: ${subCommand}`));
            break;
        }

        // Hlavní interaktivní menu
        console.log(pc.bgWhite(pc.black(' MINERAL SETUP ')));
        inquirer.prompt([{
            type: 'checkbox',
            name: 'features',
            message: 'Vyberte moznosti pro instalaci (Mezernik: oznacit, Enter: potvrdit):',
            choices: [
                { name: '  Browser   (Brave jako vychozi)', value: 'browser' },
                { name: '  VS Code   (Instalace editoru a prenos profilu)', value: 'vscode' },
                { name: '  Java      (Vyber verze pro stahovani/MC)', value: 'java' },
                { name: '  Mac Theme (Tapeta, tlacitka vlevo, Plank dock)', value: 'theme' },
                { name: '  Zkratky   (Alt+Win+Sipky/Minus pro snap a full)', value: 'shortcuts' }
            ]
        }]).then(async (answers) => {
            if (answers.features.length === 0) {
                console.log(pc.yellow('[!] Nebyly vybrany zadne polozky.'));
                return;
            }
            if (answers.features.includes('browser')) setupBrowser();
            if (answers.features.includes('vscode')) setupVSCode();
            if (answers.features.includes('java')) await setupJava();
            if (answers.features.includes('theme')) setupMacTheme();
            if (answers.features.includes('shortcuts')) setupShortcuts();
            
            console.log(pc.bgGreen(pc.black('\n [+] SETUP DOKONCEN ')));
        });
        break;

    default:
        console.log(pc.yellow(`[!] Neznamy prikaz "${command}". Napiste "mineral help".`));
}