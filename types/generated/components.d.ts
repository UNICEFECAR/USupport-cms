import type { Attribute, Schema } from '@strapi/strapi';

export interface SharedProcessedVideo extends Schema.Component {
  collectionName: 'components_shared_processed_videos';
  info: {
    description: "Upload a source video and it's converted to HLS automatically, or paste an HLS url";
    displayName: 'Processed video';
    icon: 'play';
  };
  attributes: {
    download_url: Attribute.String;
    duration_seconds: Attribute.Integer;
    error: Attribute.Text;
    hls_url: Attribute.String;
    processed_source_id: Attribute.Integer & Attribute.Private;
    source: Attribute.Media<'videos'>;
    status: Attribute.Enumeration<['pending', 'processing', 'ready', 'failed']>;
  };
}

export interface SharedUsageTip extends Schema.Component {
  collectionName: 'components_shared_usage_tips';
  info: {
    description: 'How to use the content in a given setting';
    displayName: 'Usage tip';
    icon: 'lightbulb';
  };
  attributes: {
    setting: Attribute.Enumeration<['alone', 'small_group', 'school_team']> &
      Attribute.Required;
    text: Attribute.RichText &
      Attribute.Required &
      Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'default';
        }
      >;
  };
}

export interface WorksheetChoice extends Schema.Component {
  collectionName: 'components_worksheet_choices';
  info: {
    description: 'Single choice, or a checklist when multiple is enabled';
    displayName: 'Choice';
    icon: 'check';
  };
  attributes: {
    multiple: Attribute.Boolean & Attribute.DefaultTo<false>;
    options: Attribute.Component<'worksheet.option', true>;
    prompt: Attribute.Text & Attribute.Required;
  };
}

export interface WorksheetInstruction extends Schema.Component {
  collectionName: 'components_worksheet_instructions';
  info: {
    description: '';
    displayName: 'Instruction';
    icon: 'information';
  };
  attributes: {
    body: Attribute.RichText &
      Attribute.Required &
      Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'default';
        }
      >;
  };
}

export interface WorksheetOption extends Schema.Component {
  collectionName: 'components_worksheet_options';
  info: {
    description: '';
    displayName: 'Option';
    icon: 'bulletList';
  };
  attributes: {
    label: Attribute.String & Attribute.Required;
  };
}

export interface WorksheetScale extends Schema.Component {
  collectionName: 'components_worksheet_scales';
  info: {
    description: '';
    displayName: 'Scale';
    icon: 'chartBubble';
  };
  attributes: {
    max: Attribute.Integer & Attribute.Required & Attribute.DefaultTo<5>;
    max_label: Attribute.String;
    min: Attribute.Integer & Attribute.Required & Attribute.DefaultTo<1>;
    min_label: Attribute.String;
    prompt: Attribute.Text & Attribute.Required;
  };
}

export interface WorksheetTable extends Schema.Component {
  collectionName: 'components_worksheet_tables';
  info: {
    description: '';
    displayName: 'Table';
    icon: 'grid';
  };
  attributes: {
    columns: Attribute.Component<'worksheet.option', true>;
    prompt: Attribute.Text & Attribute.Required;
    rows: Attribute.Integer & Attribute.Required & Attribute.DefaultTo<3>;
  };
}

export interface WorksheetTextInput extends Schema.Component {
  collectionName: 'components_worksheet_text_inputs';
  info: {
    description: '';
    displayName: 'Text input';
    icon: 'pencil';
  };
  attributes: {
    multiline: Attribute.Boolean & Attribute.DefaultTo<true>;
    placeholder: Attribute.String;
    prompt: Attribute.Text & Attribute.Required;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'shared.processed-video': SharedProcessedVideo;
      'shared.usage-tip': SharedUsageTip;
      'worksheet.choice': WorksheetChoice;
      'worksheet.instruction': WorksheetInstruction;
      'worksheet.option': WorksheetOption;
      'worksheet.scale': WorksheetScale;
      'worksheet.table': WorksheetTable;
      'worksheet.text-input': WorksheetTextInput;
    }
  }
}
