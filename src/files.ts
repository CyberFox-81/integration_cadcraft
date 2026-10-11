/**
 * SPDX-FileCopyrightText: 2026 Britton Couchman <brittondcouchman@gmail.com>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { IFileAction, INode } from '@nextcloud/files'

import { getCurrentUser } from '@nextcloud/auth'
import { DefaultType, FileType, Permission, registerFileAction } from '@nextcloud/files'
import { loadState } from '@nextcloud/initial-state'
import { t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { isPublicShare } from '@nextcloud/sharing/public'
import { appIcon } from './icon.ts'

const openByDefault = loadState<boolean>('integration_cadcraft', 'openByDefault', false)

/** The file types CADCraft opens; keep in sync with Application::MIME_TYPES. */
const MIME_TYPES = new Set([
	'image/vnd.dxf',
	'application/dxf',
	'image/vnd.dwg',
	'application/acad',
	'application/x-dwg',
])

/** Extensions CADCraft opens whatever their MIME type; keep in sync with Application::EXTENSIONS. */
const EXTENSIONS = new Set(['dxf', 'dwg'])

/**
 * A file CADCraft opens, in the user's own file tree (not the trash bin, versions or a
 * public share).
 *
 * @param node - The file to check
 */
function isEditableFile(node: INode | undefined): node is INode {
	return node !== undefined
		&& node.type === FileType.File
		&& (MIME_TYPES.has(node.mime ?? '') || EXTENSIONS.has((node.extension ?? '').replace(/^\./, '').toLowerCase()))
		&& node.fileid !== undefined
		&& (node.permissions & Permission.READ) !== 0
		&& node.root?.startsWith('/files/') === true
}

const editAction: IFileAction = {
	id: 'cadcraft-edit',
	displayName: () => t('integration_cadcraft', 'Edit in CADCraft'),
	iconSvgInline: () => appIcon,

	enabled({ nodes }) {
		return getCurrentUser() !== null && !isPublicShare() && nodes.length === 1 && isEditableFile(nodes[0])
	},

	async exec({ nodes }) {
		const fileId = nodes[0].fileid
		if (fileId === undefined) {
			return false
		}
		window.location.assign(generateUrl('/apps/integration_cadcraft/edit/{fileId}', { fileId }))
		return null
	},

	// Ahead of the Viewer's and office apps' default actions when CADCraft is the user's default.
	...(openByDefault ? { default: DefaultType.DEFAULT, order: -1 } : { order: 20 }),
}

registerFileAction(editAction)
