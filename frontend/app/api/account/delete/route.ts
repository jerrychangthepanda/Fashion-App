import { NextResponse } from "next/server";
import {
    createClient,
    type SupabaseClient,
} from "@supabase/supabase-js";

export const runtime = "nodejs";

const STORAGE_BUCKETS = [
    "post-images",
    "profile_picture",
];

async function deleteStorageFolder(
    admin: SupabaseClient,
    bucket: string,
    folder: string
): Promise<void> {
    const { data: entries, error: listError } =
        await admin.storage
            .from(bucket)
            .list(folder, {
                limit: 1000,
            });

    if (listError) {
        throw new Error(
            `Could not list files in ${bucket}: ${listError.message}`
        );
    }

    if (!entries || entries.length === 0) {
        return;
    }

    const files: string[] = [];
    const childFolders: string[] = [];

    for (const entry of entries) {
        const path = `${folder}/${entry.name}`;

        /*
         * Storage files have an id. Folder entries generally do not.
         */
        if (entry.id) {
            files.push(path);
        } else {
            childFolders.push(path);
        }
    }

    for (const childFolder of childFolders) {
        await deleteStorageFolder(
            admin,
            bucket,
            childFolder
        );
    }

    if (files.length > 0) {
        const { error: removeError } =
            await admin.storage
                .from(bucket)
                .remove(files);

        if (removeError) {
            throw new Error(
                `Could not remove files from ${bucket}: ${removeError.message}`
            );
        }
    }
}

export async function POST(request: Request) {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error(
            "Account deletion environment variables are missing."
        );

        return NextResponse.json(
            {
                error:
                    "Account deletion is not configured on the server.",
            },
            {
                status: 500,
            }
        );
    }

    const authorization =
        request.headers.get("authorization");

    const accessToken = authorization?.startsWith(
        "Bearer "
    )
        ? authorization.slice(7)
        : null;

    if (!accessToken) {
        return NextResponse.json(
            {
                error: "You must be logged in.",
            },
            {
                status: 401,
            }
        );
    }

    const admin = createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );

    /*
     * Do not trust a user id sent by the browser.
     * Resolve the account from the signed access token.
     */
    const {
        data: { user },
        error: userError,
    } = await admin.auth.getUser(accessToken);

    if (userError || !user) {
        return NextResponse.json(
            {
                error:
                    "Your session is invalid or has expired.",
            },
            {
                status: 401,
            }
        );
    }

    try {
        /*
         * Supabase will refuse to delete an Auth user who
         * still owns Storage objects, so remove them first.
         */
        for (const bucket of STORAGE_BUCKETS) {
            await deleteStorageFolder(
                admin,
                bucket,
                user.id
            );
        }

        const { error: deleteError } =
            await admin.auth.admin.deleteUser(
                user.id,
                false
            );

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error(
            "Permanent account deletion failed:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "The account could not be deleted.";

        return NextResponse.json(
            {
                error: message,
            },
            {
                status: 500,
            }
        );
    }
}