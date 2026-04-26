import { HeadObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2Client";

const ACL_POLICY_METADATA_KEY = "aclpolicy";

export interface StorageObject {
  bucket: string;
  key: string;
}

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

export async function setObjectAclPolicy(
  obj: StorageObject,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: obj.bucket,
      CopySource: `${obj.bucket}/${obj.key}`,
      Key: obj.key,
      Metadata: { [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy) },
      MetadataDirective: "REPLACE",
    }),
  );
}

export async function getObjectAclPolicy(
  obj: StorageObject,
): Promise<ObjectAclPolicy | null> {
  try {
    const result = await r2Client.send(
      new HeadObjectCommand({ Bucket: obj.bucket, Key: obj.key }),
    );
    const str = result.Metadata?.[ACL_POLICY_METADATA_KEY];
    if (!str) return null;
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: StorageObject;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (aclPolicy.owner === userId) {
    return true;
  }

  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}
