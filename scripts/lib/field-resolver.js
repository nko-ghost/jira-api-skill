const { AppError } = require('./errors');
const { ERROR_CODES } = require('./constants');

class FieldResolver {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.cache = {
      fields: null
    };
  }

  get storyPointsField() {
    return this.config.storyPointsField;
  }

  async getFields() {
    if (!this.cache.fields) {
      this.cache.fields = await this.client.getFields();
    }
    return this.cache.fields;
  }

  async resolveEpicLinkField() {
    if (this.config.epicLinkField) {
      return this.config.epicLinkField;
    }

    const fields = await this.getFields();
    const match = fields.find((field) => {
      const name = String(field.name || '').trim().toLowerCase();
      return name === 'epic link' || name === 'epic';
    });

    if (!match || !match.id) {
      throw new AppError(
        ERROR_CODES.VALIDATION,
        'Epic Link field could not be resolved. Set JIRA_EPIC_LINK_FIELD in .env.'
      );
    }

    return match.id;
  }
}

module.exports = {
  FieldResolver
};
