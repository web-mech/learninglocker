import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { Map, List } from 'immutable';
import { merge, map, maxBy, size } from 'lodash';
import { operators, getAvailableSection } from 'ui/redux/modules/queryBuilder';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import { withModels } from 'ui/utils/hocs';
import DiscreteCriteria from './Discrete/Criteria';
import ContinuousCriteria from './Continuous/Criteria';
import RangeCriteria from './Range/Criteria';
import BooleanCriteria from './Boolean/Criteria';
import PersonaAttributesCriteria from './PersonaAttributes/Criteria';
import Sections from './Sections';
import styles from './styles.css';

export const queryBuilderCacheFilterGenerator = ({ section }) => {
  let query;
  console.log('501 queryBuilderCacheFilterGenerator -------------');
  if (section.get('childGenerators', false)) {
    const childGenerators = section.get('childGenerators');

    const orQueryList = map(childGenerators.toJS(), (item) => {
      const keyPath = item.path;
      const keyPathQuery = merge({},
        ...map(keyPath, (item2, index) =>
          ({ [`path.${index}`]: { $eq: item2 } })
        )
      );
      return keyPathQuery;
    });

    const maxItem = maxBy(orQueryList, item => size(item));
    const maxSize = size(maxItem);

    query = { $and: [
      { $or: orQueryList },
      { path: { $size: (maxSize + 1) } }
    ] };
  } else if (section.has('keyPath')) {
    const andQuery = map(section.get('keyPath', new List()).toJS(), (item, index) =>
        ({ [`path.${index}`]: { $eq: item } })
      );

    query = { $and: [
      { $and: andQuery },
      { path: { $size: (size(andQuery) + 1) } }
    ] };
  }

  return { queryBuilderCacheFilter: query };
};

const withQueryBuilderCacheProps = withProps(
  queryBuilderCacheFilterGenerator
);

class ExpandedSection extends Component {
  static propTypes = {
    section: PropTypes.instanceOf(Map),
    sectionCriteria: PropTypes.instanceOf(Map),
    criteria: PropTypes.instanceOf(Map),
    onCriteriaChange: PropTypes.func,
    onDeleteCriterion: PropTypes.func,
    onCollapse: PropTypes.func,
    onChildrenChange: PropTypes.func,
    onAddCriterion: PropTypes.func
  }

  shouldComponentUpdate = (nextProps) => {
    const out = !(
      this.props.section.equals(nextProps.section) &&
      this.props.criteria.equals(nextProps.criteria) &&
      this.props.models.equals(nextProps.models)
    );

    return out;
  }

  collapseSection = (event) => {
    event.preventDefault();
    this.props.onCollapse();
  }

  renderContinuousCriteria = () => (
    <ContinuousCriteria
      section={this.props.section}
      criteria={this.props.sectionCriteria}
      onCriteriaChange={this.props.onCriteriaChange}
      onAddCriterion={this.props.onAddCriterion}
      onDeleteCriterion={this.props.onDeleteCriterion} />
  );

  renderRangeCriteria = () => (<RangeCriteria
    section={this.props.section}
    criteria={this.props.sectionCriteria}
    onCriteriaChange={this.props.onCriteriaChange}
    onAddCriterion={this.props.onAddCriterion}
    onDeleteCriterion={this.props.onDeleteCriterion} />
    )

  renderBooleanCriteria = () => (<BooleanCriteria
    section={this.props.section}
    criteria={this.props.sectionCriteria}
    onCriteriaChange={this.props.onCriteriaChange}
    onDeleteCriterion={this.props.onDeleteCriterion} />
    )

  renderPersonaAttributesCriteria = () => {
    console.log('401');
    return (<PersonaAttributesCriteria
      section={this.props.section}
      criteria={this.props.sectionCriteria}
      onCriteriaChange={this.props.onCriteriaChange}
      onAddCriterion={this.props.onAddCriterion}
      onDeleteCriterion={this.props.onDeleteCriterion} />
    );
  }

  renderDiscreteCriteria = () => {
    console.log('402');
    const out = (
      <DiscreteCriteria
        section={this.props.section}
        criteria={this.props.sectionCriteria}
        onCriteriaChange={this.props.onCriteriaChange}
        onAddCriterion={this.props.onAddCriterion}
        onDeleteCriterion={this.props.onDeleteCriterion} />
    );
    return out;
  };

  renderCriteria = () => {
    const ops = this.props.section.get('operators');

    console.log('403', ops);
    console.log('403.1', this.props.section);

    switch (ops) {
      case operators.CONTINUOUS: return this.renderContinuousCriteria();
      case operators.RANGE: return this.renderRangeCriteria();
      case operators.BOOLEAN: return this.renderBooleanCriteria();
      case operators.PERSONA_ATTRIBUTES: return this.renderPersonaAttributesCriteria();
      default: return this.renderDiscreteCriteria();
    }
  };

  render = () => {
    const { section } = this.props;
    const title = section.get('title', '');
    const children = section.get('children', new Map());
    const hasCriteria = section.has('operators');

    return (
      <div className={styles.expandedSection}>
        <span
          className={styles.expandedTitle}
          onClick={this.collapseSection}>
          <i className="ion-minus-round" /> {title}
        </span>
        {hasCriteria && <div className={styles.expandedCriteria}>
          {this.renderCriteria()}
        </div>}
        {children.size > 0 &&
          <Sections
            className={styles.expandedChildren}
            sections={children}
            criteria={this.props.criteria}
            onCriteriaChange={this.props.onCriteriaChange}
            onSectionsChange={this.props.onChildrenChange}
            onAddCriterion={this.props.onAddCriterion}
            onDeleteCriterion={this.props.onDeleteCriterion} />
        }
      </div>
    );
  }
}

export default compose(
  withStyles(styles),
  withQueryBuilderCacheProps,
  connect((state, {
    queryBuilderCacheFilter,
    section
  }) => {
    const availableSection = getAvailableSection(
      section,
      queryBuilderCacheFilter
    )(state);

    return { section: section.mergeDeep(availableSection) };
  }, {}),
  withProps(({ queryBuilderCacheFilter }) => ({
    schema: 'querybuildercache',
    filter: queryBuilderCacheFilter,
    first: 1000
  })),
  withModels
)(ExpandedSection);
