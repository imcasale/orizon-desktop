#!/bin/bash
# Orizon: toglie il collegamento /usr/bin/${executable} e il profilo AppArmor solo quando
# il pacchetto viene disinstallato davvero. Negli aggiornamenti non tocca niente: il pacchetto
# nuovo li ha appena rimessi a posto (con rpm il suo script gira prima di questo).
#   deb: postrm remove|purge|upgrade|...   rpm: %postun <quante copie restano>   pacman: post_remove <versione>
case "$1" in
  upgrade|failed-upgrade|abort-upgrade|[1-9]|[1-9][0-9])
    ;;
  *)
    if type update-alternatives >/dev/null 2>&1; then
      update-alternatives --remove '${executable}' '/opt/${sanitizedProductName}/${executable}' >/dev/null 2>&1 || true
    fi
    if [ -L '/usr/bin/${executable}' ] && [ ! -e '/usr/bin/${executable}' ]; then
      rm -f '/usr/bin/${executable}'
    fi
    rm -f '/etc/apparmor.d/${executable}'
    ;;
esac
exit 0
