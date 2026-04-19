import { ethers, type JsonRpcSigner } from 'ethers';
import { API_BASE_URL } from '../config/env';
import { addMonitoringBreadcrumb, captureException, captureMonitoringEvent } from '../instrumentation/sentry';
import { getWalletSessionToken } from './secureToken';

export type DidTxPhase = 'signing' | 'pending' | 'confirmed' | 'failed';

export type DidUpdatePrepareResponse = {
  success: boolean;
  message?: string;
  data?: {
    to: string;
    data: string;
    chainId: number;
    value?: string;
  };
};

export type SaveChatApiData = {
  requiresDidUpdate?: boolean;
  chatReference?: string;
  preserveEncryptedKeyMetadata?: string | null;
};

/**
 * Backend prepares calldata; wallet signs and broadcasts (parity with web updateChatReference).
 */
export async function prepareDidChatReferenceUpdate(
  chatReference: string,
  encryptedKeyMetadataHex = '0x',
): Promise<DidUpdatePrepareResponse> {
  const token = await getWalletSessionToken();
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  const res = await fetch(`${API_BASE_URL}/api/did/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatReference, encryptedKeyMetadataHex }),
  });

  const json = (await res.json()) as DidUpdatePrepareResponse;
  if (!res.ok) {
    return {
      success: false,
      message: json.message || `DID prepare failed (${res.status})`,
    };
  }
  return json;
}

export type TriggerDidOptions = {
  onPhase?: (phase: DidTxPhase, detail?: string) => void;
};

export async function triggerDidUpdateAfterSave(
  signer: JsonRpcSigner,
  saveData: SaveChatApiData,
  options?: TriggerDidOptions,
): Promise<void> {
  if (!saveData.requiresDidUpdate || !saveData.chatReference) {
    return;
  }

  const onPhase = options?.onPhase;
  let metaHex = '0x';
  const rawMeta = saveData.preserveEncryptedKeyMetadata;
  if (typeof rawMeta === 'string' && rawMeta.startsWith('0x') && rawMeta.length > 2) {
    try {
      ethers.getBytes(rawMeta);
      metaHex = rawMeta;
    } catch {
      metaHex = '0x';
    }
  }

  try {
    addMonitoringBreadcrumb('did', 'prepare_did_update', { chatRef: saveData.chatReference });
    const prepared = await prepareDidChatReferenceUpdate(saveData.chatReference, metaHex);
    if (!prepared.success || !prepared.data?.to || !prepared.data?.data) {
      throw new Error(prepared.message || 'DID update prepare failed');
    }

    onPhase?.('signing');
    addMonitoringBreadcrumb('did', 'send_transaction');
    const tx = await signer.sendTransaction({
      to: prepared.data.to,
      data: prepared.data.data,
      chainId: prepared.data.chainId,
    });
    onPhase?.('pending', tx.hash);
    addMonitoringBreadcrumb('did', 'tx_submitted', { hash: tx.hash });
    await tx.wait();
    onPhase?.('confirmed');
    captureMonitoringEvent('did_chat_reference_confirmed', { area: 'did_tx' }, 'info');
  } catch (e) {
    onPhase?.('failed');
    captureException(e, { area: 'did_tx', phase: 'submit_or_confirm' });
    captureMonitoringEvent('did_chat_reference_failed', { area: 'did_tx' }, 'error');
    throw e;
  }
}
