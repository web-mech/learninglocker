import React from 'react';
import { compose, withProps } from 'recompose';
import { withModels } from 'ui/utils/hocs';
import classNames from 'classnames';
import Criterion from './Criterion';
import styles from '../styles.css';

const renderCriterion = (value, key) => {

  const sectionClasses = classNames(styles.collapsedSection, {
    // [styles.usedCollapsedSection]: containsCriteria,
    // [styles.unusedCollapsedSection]: !containsCriteria,
  });

  return (
    <div>
      <a
        onClick=""
        className={sectionClasses} >
        { value.get('key') }
      </a>
      <Criterion
        key={key} />
    </div>
  );
};

const PersonaAttributeCriteriaComponent = ({
  models
}) => {
  console.log('201', models);
  console.log('WAT');

  return (
    <div>
      {models.map(renderCriterion).valueSeq()}
    </div>
  );
};

export default compose(
  withProps(() => {
    console.log('203 ================');
    const out = ({
      schema: 'personaAttribute',
      filter: {},
      first: 1000
    });
    console.log('202', out);
    return out;
  }),
  withModels
)(PersonaAttributeCriteriaComponent);
