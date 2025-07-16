import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './config';
import type { PanelInvitation } from './types';

export type { PanelInvitation };

const INVITATIONS_COLLECTION = 'panelInvitations';

/**
 * Generate a unique invitation token
 */
function generateInvitationToken(): string {
  return crypto.randomUUID();
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  email: string,
  panelId: string,
  panelName: string,
  invitedBy: string,
  invitedByName?: string,
  message?: string
): Promise<string> {
  const invitationRef = doc(collection(db, INVITATIONS_COLLECTION));
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire after 7 days
  
  const invitation: Omit<PanelInvitation, 'id'> = {
    email: email.toLowerCase(),
    panelId,
    panelName,
    status: 'pending',
    invitedBy,
    invitedByName,
    token: generateInvitationToken(),
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt
  };
  
  // Only add message if it's provided
  if (message) {
    invitation.message = message;
  }
  
  await setDoc(invitationRef, {
    ...invitation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt)
  });
  
  return invitationRef.id;
}

/**
 * Send bulk invitations
 */
export async function sendBulkInvitations(
  emails: string[],
  panelId: string,
  panelName: string,
  invitedBy: string,
  invitedByName?: string,
  message?: string
): Promise<{ sent: number; failed: string[] }> {
  const sent: string[] = [];
  const failed: string[] = [];
  
  // Check for existing active invitations
  const existingInvitationsQuery = query(
    collection(db, INVITATIONS_COLLECTION),
    where('panelId', '==', panelId),
    where('email', 'in', emails.map(e => e.toLowerCase())),
    where('status', '==', 'pending')
  );
  
  const existingInvitations = await getDocs(existingInvitationsQuery);
  const existingEmails = new Set(
    existingInvitations.docs.map(doc => doc.data().email)
  );
  
  // Create invitations for new emails
  const invitationPromises = emails
    .filter(email => !existingEmails.has(email.toLowerCase()))
    .map(async (email) => {
      try {
        const invitationId = await createInvitation(
          email,
          panelId,
          panelName,
          invitedBy,
          invitedByName,
          message
        );
        
        // Call cloud function to send email
        const sendInvitationEmail = httpsCallable(functions, 'sendInvitationEmail');
        
        // Check current auth state
        const currentUser = auth.currentUser;
        console.log('Current user:', currentUser?.uid, currentUser?.email);
        
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        console.log('Calling sendInvitationEmail with invitationId:', invitationId);
        const result = await sendInvitationEmail({ invitationId });
        console.log('SendInvitationEmail result:', result);
        
        sent.push(email);
      } catch (error) {
        console.error(`Failed to send invitation to ${email}:`, error);
        failed.push(email);
      }
    });
  
  await Promise.all(invitationPromises);
  
  // Add already invited emails to failed list with explanation
  existingEmails.forEach(email => {
    failed.push(`${email} (pending invitation already exists)`);
  });
  
  return { sent: sent.length, failed };
}

/**
 * Get invitations by panel
 */
export async function getInvitationsByPanel(panelId: string): Promise<PanelInvitation[]> {
  const q = query(
    collection(db, INVITATIONS_COLLECTION),
    where('panelId', '==', panelId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PanelInvitation));
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<PanelInvitation | null> {
  const q = query(
    collection(db, INVITATIONS_COLLECTION),
    where('token', '==', token)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as PanelInvitation;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  invitationId: string,
  expertId: string
): Promise<void> {
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  
  await updateDoc(invitationRef, {
    status: 'accepted',
    expertId,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  
  await updateDoc(invitationRef, {
    status: 'declined',
    declinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string): Promise<void> {
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  const invitationDoc = await getDoc(invitationRef);
  
  if (!invitationDoc.exists()) {
    throw new Error('Invitation not found');
  }
  
  const invitation = invitationDoc.data();
  
  if (invitation.status !== 'pending') {
    throw new Error('Can only resend pending invitations');
  }
  
  // Update expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await updateDoc(invitationRef, {
    expiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp()
  });
  
  // Call cloud function to send email
  const sendInvitationEmail = httpsCallable(functions, 'sendInvitationEmail');
  await sendInvitationEmail({ invitationId });
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  
  await updateDoc(invitationRef, {
    status: 'expired',
    updatedAt: serverTimestamp()
  });
}