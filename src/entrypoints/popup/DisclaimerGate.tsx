import React, { useEffect, useState } from 'react';

import DisclaimerModal from '../../components/popup/DisclaimerModal';

import type { AppProps } from './types';
import storageService from './services/StorageService';
import MainApp from './MainApp';

const DisclaimerGate: React.FC<AppProps> = ({ onClose, showCloseInHeader = true }) => {
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [dontShowAgainDefault, setDontShowAgainDefault] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const state = await storageService.getDisclaimerState();
      if (!mounted) return;
      const ok = state?.agreed === true;
      setAgreed(ok);
      setDontShowAgainDefault(Boolean(state?.dontShowAgain));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (agreed !== true) {
    if (agreed === null) return null;
    return (
      <DisclaimerModal
        allowDontShowAgain={false}
        defaultDontShowAgain={dontShowAgainDefault}
        onAgree={async ({ dontShowAgain }) => {
          await storageService.setDisclaimerState({ agreed: true, dontShowAgain });
          setAgreed(true);
        }}
        onCancel={async () => {
          await storageService.setDisclaimerState({ agreed: false, dontShowAgain: false });
          if (typeof onClose === 'function') {
            onClose();
            return;
          }
          try {
            window.close();
          } catch {
            // ignore
          }
          setDontShowAgainDefault(false);
          setAgreed(false);
        }}
      />
    );
  }

  return <MainApp onClose={onClose} showCloseInHeader={showCloseInHeader} />;
};

export default DisclaimerGate;
