#!/bin/bash

if type update-alternatives >/dev/null 2>&1; then
    # Remove previous link if it doesn't use update-alternatives
    if [ -L '/usr/bin/${executable}' -a -e '/usr/bin/${executable}' -a "`readlink '/usr/bin/${executable}'`" != '/etc/alternatives/${executable}' ]; then
        rm -f '/usr/bin/${executable}'
    fi
    update-alternatives --install '/usr/bin/${executable}' '${executable}' '/opt/${sanitizedProductName}/${executable}' 100 || ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
else
    ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
fi

# Check if user namespaces are supported by the kernel and working with a quick test:
if ! { [[ -L /proc/self/ns/user ]] && unshare --user true; }; then
    # Use SUID chrome-sandbox only on systems without user namespaces:
    chmod 4755 '/opt/${sanitizedProductName}/chrome-sandbox' || true
else
    chmod 0755 '/opt/${sanitizedProductName}/chrome-sandbox' || true
fi

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# Install apparmor profile. (Ubuntu 24+)
# First check if the version of AppArmor running on the device supports our profile.
# This is in order to keep backwards compatibility with Ubuntu 22.04 which does not support abi/4.0.
# In that case, we just skip installing the profile since the app runs fine without it on 22.04.
#
# Those apparmor_parser flags are akin to performing a dry run of loading a profile.
# https://wiki.debian.org/AppArmor/HowToUse#Dumping_profiles
#
# Unfortunately, at the moment AppArmor doesn't have a good story for backwards compatibility.
# https://askubuntu.com/questions/1517272/writing-a-backwards-compatible-apparmor-profile
if apparmor_status --enabled > /dev/null 2>&1; then
  APPARMOR_PROFILE_SOURCE='/opt/${sanitizedProductName}/resources/apparmor-profile'
  APPARMOR_PROFILE_TARGET='/etc/apparmor.d/${executable}'
  if apparmor_parser --skip-kernel-load --debug "$APPARMOR_PROFILE_SOURCE" > /dev/null 2>&1; then
    cp -f "$APPARMOR_PROFILE_SOURCE" "$APPARMOR_PROFILE_TARGET"

    # Updating the current AppArmor profile is not possible and probably not meaningful in a chroot'ed environment.
    # Use cases are for example environments where images for clients are maintained.
    # There, AppArmor might correctly be installed, but live updating makes no sense.
    if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
      # Extra flags taken from dh_apparmor:
      # > By using '-W -T' we ensure that any abstraction updates are also pulled in.
      # https://wiki.debian.org/AppArmor/Contribute/FirstTimeProfileImport
      apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE_TARGET"
    fi
  else
    echo "Skipping the installation of the AppArmor profile as this version of AppArmor does not seem to support the bundled profile"
  fi
fi

# Orizon: aggiornamenti insieme a quelli del sistema (sudo dnf upgrade, sudo apt upgrade).
# Al primo avvio del pacchetto aggiunge il repository di Orizon con la sua chiave pubblica.
ORIZON_REPO='https://4orizon.eu/repo'
ORIZON_CHIAVE='/opt/${sanitizedProductName}/resources/orizon.asc'
if [ -f "$ORIZON_CHIAVE" ]; then
  if [ -d /etc/apt/sources.list.d ]; then
    mkdir -p /usr/share/keyrings
    cp -f "$ORIZON_CHIAVE" /usr/share/keyrings/orizon-archive-keyring.asc
    chmod 644 /usr/share/keyrings/orizon-archive-keyring.asc
    if [ ! -e /etc/apt/sources.list.d/orizon.sources ] && [ ! -e /etc/apt/sources.list.d/orizon.sources.disabled ]; then
      printf 'Types: deb\nURIs: %s/deb\nSuites: stable\nComponents: main\nArchitectures: amd64\nSigned-By: /usr/share/keyrings/orizon-archive-keyring.asc\n' "$ORIZON_REPO" > /etc/apt/sources.list.d/orizon.sources
    fi
  elif [ -d /etc/yum.repos.d ] || [ -d /etc/zypp/repos.d ]; then
    mkdir -p /etc/pki/rpm-gpg
    cp -f "$ORIZON_CHIAVE" /etc/pki/rpm-gpg/RPM-GPG-KEY-orizon
    chmod 644 /etc/pki/rpm-gpg/RPM-GPG-KEY-orizon
    for D in /etc/yum.repos.d /etc/zypp/repos.d; do
      if [ -d "$D" ] && [ ! -e "$D/orizon.repo" ]; then
        printf '[orizon]\nname=Orizon\nbaseurl=%s/rpm\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-orizon\nmetadata_expire=6h\n' "$ORIZON_REPO" > "$D/orizon.repo"
      fi
    done
  fi
fi
