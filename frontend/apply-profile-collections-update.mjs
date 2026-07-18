import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);

  if (!matches) {
    fail(
      `Could not find the ${label} section in components/ProfileView.tsx. ` +
        "Make sure you are applying this package to the July 18 collection-sharing version of the repo."
    );
  }

  return source.replace(pattern, replacement);
}

const currentDirectory = process.cwd();
const frontendRoot = fs.existsSync(
  path.join(currentDirectory, "components", "ProfileView.tsx")
)
  ? currentDirectory
  : fs.existsSync(
      path.join(
        currentDirectory,
        "frontend",
        "components",
        "ProfileView.tsx"
      )
    )
  ? path.join(currentDirectory, "frontend")
  : null;

if (!frontendRoot) {
  fail(
    "Run this command from your Fashion-App/frontend folder, or from the Fashion-App repository root."
  );
}

const profileViewPath = path.join(
  frontendRoot,
  "components",
  "ProfileView.tsx"
);
let source = fs.readFileSync(profileViewPath, "utf8");

if (source.includes("ProfileCollectionsPanel")) {
  console.log(
    "ProfileView.tsx already contains the collection subtabs. No patch was needed."
  );
} else {
  const backupPath = `${profileViewPath}.before-collection-subtabs`;
  fs.copyFileSync(profileViewPath, backupPath);

  // The Plus icon moves into ProfileCollectionsPanel.
  source = source.replace(/^\s{2}Plus,\r?\n/m, "");

  source = replaceOnce(
    source,
    /import\s*\{\s*createCollection,\s*type Collection,\s*\}\s*from\s*"@\/lib\/collections";\s*import\s*\{\s*CollectionTile\s*\}\s*from\s*"@\/components\/CollectionTile";/m,
    `import {
  createCollection,
  type Collection,
  type SharedCollection,
} from "@/lib/collections";
import { ProfileCollectionsPanel } from "@/components/ProfileCollectionsPanel";`,
    "collection imports"
  );

  source = replaceOnce(
    source,
    /posts = \[\],\r?\n\s*collections = \[\],\r?\n\s*\}: \{/m,
    `posts = [],
  collections = [],
  sharedCollections = [],
}: {`,
    "ProfileView property defaults"
  );

  source = replaceOnce(
    source,
    /posts\?: LocalPost\[\];\r?\n\s*collections\?: Collection\[\];/m,
    `posts?: LocalPost[];
  collections?: Collection[];
  sharedCollections?: SharedCollection[];`,
    "ProfileView property types"
  );

  source = replaceOnce(
    source,
    /<div className="grid grid-cols-3 gap-4 pt-4">[\s\S]*?<\/div>\r?\n\s*\)\}\r?\n\s*<\/div>\r?\n\r?\n\s*<FollowListSheet/m,
    `<ProfileCollectionsPanel
          collections={collections}
          sharedCollections={sharedCollections}
          posts={posts}
          isOwnProfile={isOwnProfile}
          onOpenCollection={handleOpenCollection}
          onCreateCollection={() => void handleCreateCollection()}
        />
      )}
    </div>

    <FollowListSheet`,
    "collections grid"
  );

  fs.writeFileSync(profileViewPath, source, "utf8");
  console.log("Updated components/ProfileView.tsx");
  console.log(`Backup created at: ${backupPath}`);
}

const oldSettingsRoute = path.join(
  frontendRoot,
  "app",
  "profile",
  "settings",
  "shared-collections",
  "page.tsx"
);

if (fs.existsSync(oldSettingsRoute)) {
  fs.rmSync(oldSettingsRoute, { force: true });
  const routeDirectory = path.dirname(oldSettingsRoute);

  try {
    fs.rmdirSync(routeDirectory);
  } catch {
    // Keep the directory if the user has placed another file there.
  }

  console.log(
    "Removed app/profile/settings/shared-collections/page.tsx"
  );
}

console.log("\nProfile collection subtab update finished successfully.\n");
