; Guardurai Windows — Inno Setup installer script
; Produces Guardurai-Setup.exe which registers in Add/Remove Programs,
; creates Start Menu + optional Desktop shortcut, and handles uninstall.

[Setup]
AppName=Guardurai
AppVersion=1.0.0
AppPublisher=Guardurai Ltd
AppPublisherURL=https://guardurai.com
AppSupportURL=https://guardurai.com
AppUpdatesURL=https://guardurai.com
DefaultDirName={localappdata}\Programs\Guardurai
DefaultGroupName=Guardurai
OutputBaseFilename=Guardurai-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Guardurai
UninstallDisplayIcon={app}\Guardurai.exe
; No UAC prompt — installs per-user into %LocalAppData%\Programs
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline
ArchitecturesInstallIn64BitMode=x64compatible
; Minimum Windows 10
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &Desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "startup"; Description: "Start Guardurai &automatically when I log in"; GroupDescription: "Startup:"

[Files]
Source: "dist\Guardurai.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Guardurai"; Filename: "{app}\Guardurai.exe"; Comment: "Real-time scam protection"
Name: "{group}\Uninstall Guardurai"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Guardurai"; Filename: "{app}\Guardurai.exe"; Tasks: desktopicon; Comment: "Real-time scam protection"

[Registry]
; Auto-start entry (only when user ticks the startup task)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "Guardurai"; \
  ValueData: """{app}\Guardurai.exe"""; \
  Flags: uninsdeletevalue; Tasks: startup

[Run]
; Offer to launch immediately after install
Filename: "{app}\Guardurai.exe"; \
  Description: "Launch Guardurai now"; \
  Flags: nowait postinstall skipifsilent
