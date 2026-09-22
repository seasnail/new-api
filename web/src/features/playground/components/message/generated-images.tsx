/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'

import type { MessageVersion } from '../../types'

export function GeneratedImages(props: { version: MessageVersion }) {
  const { t } = useTranslation()
  const images = props.version.images ?? []
  if (!images.length) {
    return props.version.imagesOmitted ? (
      <p className='text-muted-foreground text-sm'>
        {t(
          'Images from this response were not saved. Generate them again to view them.'
        )}
      </p>
    ) : null
  }
  return (
    <div className='grid w-full max-w-2xl gap-3'>
      {images.map((image, index) => {
        const src = `data:image/${image.output_format};base64,${image.result}`
        return (
          <figure key={image.id} className='min-w-0 space-y-2'>
            <img
              src={src}
              alt={t('Generated image {{number}}', { number: index + 1 })}
              className='max-h-[32rem] max-w-full rounded-lg object-contain'
              loading='lazy'
            />
            <figcaption>
              <a
                href={src}
                download={`generated-image-${index + 1}.${image.output_format}`}
                className='text-primary inline-flex rounded-sm text-sm underline underline-offset-4 focus-visible:ring-2'
              >
                {t('Download image {{number}}', { number: index + 1 })}
              </a>
            </figcaption>
          </figure>
        )
      })}
      <p className='text-muted-foreground text-xs'>
        {t(
          'Generated images are available until you refresh. Download them to keep a copy.'
        )}
      </p>
    </div>
  )
}
