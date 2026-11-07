# IZA LIFE — Platform Configurations & Microservices Architecture

This guide details the exact manual step configurations required in your external developer dashboards (Supabase, Firebase, and Google Cloud Platform) to integrate your sovereign microservices.

---

## A. Supabase Dashboard Configuration (Storage & Row-Level Security)

### 1. Create the Isolated Vault Bucket
1. Open your **Supabase Console** and select your project.
2. Navigate to the **Storage** tab on the left-hand navigation sidebar.
3. Click **New Bucket**.
4. Set Name: `moments_vault` (exact spelling).
5. Ensure the **Public** toggle is turned **OFF** (this guarantees zero public unauthenticated access).
6. Click **Save bucket**.

### 2. Configure Row-Level Security (RLS) Policy for User Isolation
1. Inside the `moments_vault` bucket configuration, select the **Policies** tab.
2. Click **New Policy** -> *For full customization*.
3. Configuration fields:
   - **Policy Name**: `Users can only access their own sovereign directory`
   - **Allowed Operations**: Check **ALL** (`SELECT`, `INSERT`, `UPDATE`, `DELETE`)
   - **Target Roles**: `authenticated`
   - **USING expression**:
     ```sql
     (auth.uid() = (storage.foldername(name))[1]::uuid)
     ```
   - **WITH CHECK expression**:
     ```sql
     (auth.uid() = (storage.foldername(name))[1]::uuid)
     ```
4. Click **Review** and **Save Policy**.

> **Cryptographic Effect**: This strictly confines file uploads, reads, and deletions so authenticated users can only interact with objects inside a folder matching their exact profile identity token (`userId`).

---

## B. Firebase Console (Identity Provider Setup)

1. Open the **Firebase Console** and select project `earth-i` (or your primary tracking ID).
2. Go to **Authentication** -> **Sign-in method** tab.
3. Enable Identity Providers:
   - **Google**: Toggle **Enable**, set support email, and save.
   - **Apple**: Toggle **Enable**, configure Service ID and Team ID for iOS App Store support.
4. Copy the auto-generated **OAuth Redirect URI** string:
   ```text
   https://earth-i.firebaseapp.com/__/auth/handler
   ```
5. **Web Client Mapping**: Note the **Web Client ID** and **Web Client Secret** generated under Project Settings -> General -> Web Apps. Map these into your environment configuration.

---

## C. Google Cloud Platform (GCP) Console Configuration

1. Access the **Google Cloud Console** with the project matching your Firebase ID.
2. Go to **APIs & Services** -> **Enabled APIs & Services**.
3. Click **+ ENABLE APIS AND SERVICES** and enable:
   - **Vertex AI API** (for Gemini foundational models & vector generation)
   - **Cloud Storage API** (for binary persistence)
4. Go to **APIs & Services** -> **Credentials**.
5. Locate your primary **OAuth 2.0 Client ID** (Web application).
6. In the **Authorized redirect URIs** section, paste the Firebase handler URI:
   ```text
   https://earth-i.firebaseapp.com/__/auth/handler
   ```
7. In the **Authorized JavaScript origins** section, include:
   - `https://earth-i.firebaseapp.com`
   - `https://earth-i.web.app`
   - `https://izalife.app`
   - Your AI Studio development and production deployment domains.
8. Click **Save**.
